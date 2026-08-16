import { inflateSync, unzlibSync } from "fflate";
import { makeZip } from "client-zip";

import type { FileInfo } from "$lib/types/libav";

type ZipEntry = {
    name: string,
    method: number,
    data: Uint8Array,
}

// xod is pdftron/apryse webviewer's encrypted document format: a zip where
// every part is stored raw (the deflate method flag lies) and the bytes are
// aes-cbc encrypted. the 16-byte key is derived per part from the password
// and the part name:
//
//     key[d] = d | password.charCodeAt(d) | partName.charCodeAt(len + d - 16)
//
// the first 16 bytes of a part are the iv, the rest is the ciphertext.
// decrypted non-image parts are raw deflate streams and get inflated
// (jpg/png images are used as-is). the result is a plain, unencrypted xps.
const parseZip = (buf: Uint8Array): ZipEntry[] => {
    const entries: ZipEntry[] = [];

    let eocd = buf.length - 22;
    while (eocd > 0
        && !(buf[eocd] === 0x50 && buf[eocd + 1] === 0x4b
            && buf[eocd + 2] === 0x05 && buf[eocd + 3] === 0x06)) {
        eocd--;
    }
    if (eocd <= 0) throw new Error("no end of central directory");

    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const count = dv.getUint16(eocd + 10, true);
    const cdOffset = dv.getUint32(eocd + 16, true);

    let p = cdOffset;
    for (let i = 0; i < count; i++) {
        if (dv.getUint32(p, true) !== 0x02014b50) {
            throw new Error("bad central directory entry");
        }

        const method = dv.getUint16(p + 10, true);
        const compSize = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true);
        const extraLen = dv.getUint16(p + 30, true);
        const commentLen = dv.getUint16(p + 32, true);
        const localOffset = dv.getUint32(p + 42, true);
        const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));

        // skip directory entries
        if (!name.endsWith("/")) {
            const lnameLen = dv.getUint16(localOffset + 26, true);
            const lextraLen = dv.getUint16(localOffset + 28, true);
            const dataStart = localOffset + 30 + lnameLen + lextraLen;
            entries.push({ name, method, data: buf.subarray(dataStart, dataStart + compSize) });
        }

        p += 46 + nameLen + extraLen + commentLen;
    }

    return entries;
}

const deriveKey = (password: string, partName: string) => {
    const key = new Uint8Array(16);
    for (let d = 0; d < 16; ++d) {
        let b = d;
        if (d < password.length) b |= password.charCodeAt(d);
        const g = partName.length + d - 16;
        if (g >= 0) b |= partName.charCodeAt(g);
        key[d] = b;
    }
    return key;
}

const decryptPart = async (entry: ZipEntry, password: string): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey(
        "raw",
        deriveKey(password, entry.name),
        { name: "AES-CBC" },
        false,
        ["decrypt"],
    );

    // a wrong password (or a part that isn't encrypted) makes either the
    // padding check or the inflate below throw, which triggers the
    // plain-zip fallback / bad-password error. copy the iv/ciphertext into
    // fresh arrays: subarray views type as ArrayBufferLike, which the
    // webcrypto types reject
    const plain = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv: new Uint8Array(entry.data.subarray(0, 16)) },
        key,
        new Uint8Array(entry.data.subarray(16)),
    );

    return new Uint8Array(plain);
}

const convert = async (file: File, password: string, output: FileInfo) => {
    if (!output?.format) {
        self.postMessage({ cobaltXodWorker: { error: "queue.ffmpeg.no_args" } });
        return;
    }

    const error = (code: string) => {
        self.postMessage({ cobaltXodWorker: { error: code } });
    }

    try {
        const buf = new Uint8Array(await file.arrayBuffer());
        const entries = parseZip(buf);

        if (!entries.length) {
            return error("queue.xod.bad_password");
        }

        const parts = new Map<string, Uint8Array>();

        // first pass: password-encrypted parts (decrypt, then raw-inflate
        // everything except images)
        try {
            for (const entry of entries) {
                const ext = entry.name.split(".").pop()?.toLowerCase() || "";
                let data = await decryptPart(entry, password);
                if (ext !== "jpg" && ext !== "jpeg" && ext !== "png") {
                    data = inflateSync(data);
                }
                parts.set(entry.name, data);
            }
        } catch {
            // not encrypted: treat it as a plain zip and inflate entries
            // by their real method flag (0 = stored, 8 = deflate)
            try {
                for (const entry of entries) {
                    parts.set(
                        entry.name,
                        // standard zips use zlib-wrapped deflate
                        entry.method === 8 ? unzlibSync(entry.data) : entry.data,
                    );
                }
            } catch {
                return error("queue.xod.bad_password");
            }
        }

        const zipFiles = [...parts.entries()].map(([name, data]) =>
            // copy into a fresh Uint8Array (inflate output types as
            // ArrayBufferLike, which BlobPart rejects)
            new File([new Uint8Array(data)], name)
        );

        const zip = makeZip(zipFiles, "output.xps");
        const reader = zip.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
            const { done: d, value } = await reader.read();
            if (value) chunks.push(value);
            done = d;
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const finalBytes = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            finalBytes.set(chunk, offset);
            offset += chunk.length;
        }

        if (!finalBytes?.length) {
            return error("queue.ffmpeg.no_render");
        }

        const result = new File([finalBytes], `output.${output.format}`, {
            type: output.type,
        });

        self.postMessage({ cobaltXodWorker: { render: result } });
    } catch (e) {
        console.error("error from the xod worker:");
        console.error(e);
        return error("queue.ffmpeg.crashed");
    }
}

self.onmessage = async (event: MessageEvent) => {
    const ed = event.data.cobaltXodWorker;
    if (ed?.files && ed?.output) {
        await convert(ed.files[0], ed.password || "", ed.output);
    }
}

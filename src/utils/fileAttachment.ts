import { AttachmentBuilder } from 'discord.js';

export function codeBlock(text: string, lang = ''): string {
    return `\`\`\`${lang}\n${text}\n\`\`\``;
}

export function safeFieldValue(content: string, filename = 'output.txt'): { preview: string; attachment?: AttachmentBuilder } {
    if (content.length <= 1024) {
        return { preview: content };
    }
    const buffer = Buffer.from(content, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: filename });
    return {
        preview: '*(Output too long for embed field; attached as file)*',
        attachment,
    };
}

// Restored missing function for request.ts
export function buildPayloadOutput(content: string, filename = 'payload.txt'): { preview: string; attachment?: AttachmentBuilder } {
    if (content.length <= 1024) {
        return { preview: codeBlock(content, filename.endsWith('.json') ? 'json' : '') };
    }
    const buffer = Buffer.from(content, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: filename });
    return {
        preview: '*(Output too long for embed field; attached as file)*',
        attachment,
    };
}

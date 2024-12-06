export function createUsername(name) {
    const [n,l] = name.split(' ')
    return `${n[0]}${l}`.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\ /g,'');
}

export function normalizeName(name) {
    name = name.replace(/[ñÑ]/g, '1');
    name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toUpperCase();
    name = name.replace('1', 'Ñ');
    return name;
}

export function createPersonId(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\ /g,'');
}

export function createRandomPassword(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function sanitize(fields) {
    for (const p in fields) {
        if (typeof fields[p] === 'string') fields[p] = fields[p].trim();
    }
}

export function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

export const ContentTypes = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml'
}

export function createUsername(name) {
    const [n,l] = name.split(' ')
    return `${n[0]}${l}`.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\ /g,'');
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

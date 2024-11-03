import csv from 'csv-parser';
import fs from 'fs';

const validFields = {
    user: ['name', 'email'],
    person: ['name', 'email', 'gender', 'cellphone', 'illness', 'tutor', 'zone','branch', 'room']
}

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
  
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

function validateHeaders(headers,type) {
    if (arraysEqual(headers, validFields[type])) return
    throw new Error(`Expected headers like ${validFields[type]} but ${headers} was provided`);
}

function validateField(field,type) {
    if (arraysEqual(Object.keys(field), validFields[type])) return
    throw new Error(`Expected record like ${validFields[type]} but ${Object.values(field)} was provided`);
}

export function parseCsv(filePath, type) {
    if (!filePath.endsWith('.csv')) throw new Error('Only CSV files are supported');
    const records = [];
    
    return new Promise (function (resolve,reject) {
        fs.createReadStream(filePath).pipe(csv())
        .on('headers', (headers) => {
            validateHeaders(headers,type);
        })
        .on('error', error => reject(error))
        .on('data', (data) => {
            validateField(data,type);
            records.push(data);
        })
        .on('end', () => resolve(records) )
    });
}

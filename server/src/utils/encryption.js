import CryptoJs from "crypto-js";

const key = process.env.CRYPTO_KEY;

const iv = CryptoJs.lib.WordArray.random(16);

export const encryptData = (data) =>
   CryptoJs.AES.encrypt(data, key, {
      iv: iv,
   }).toString();

export const decryptData = (encryptedData) =>
   CryptoJs.AES.decrypt(encryptedData, key, {
      iv: iv,
   }).toString(CryptoJs.enc.Utf8);

export const encryptField = (value) => encryptData(value);
export const decryptField = (value) => decryptData(value);

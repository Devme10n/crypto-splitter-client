
/**
 * 16진수 문자열을 ArrayBuffer로 변환
 * @param hexString
 * @returns
 */
const _arrayBufferFromHexString = (hexString: string) => {
  const bytes = Uint8Array.from(hexString.match(/.{1,2}/g).map((byte: any) => parseInt(byte, 16)));
  return bytes.buffer;
}

/**
 * 문자열을 ArrayBuffer로 변환
 * @param str 
 * @returns 
 */
const _stringToArrayBuffer = (str: string)=>{
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * 주어진 문자열을 SHA-256 해시값으로 변환
 * @param message 
 * @returns 
 */
const _digestMessage = async (message: string) => {
  const data = _stringToArrayBuffer(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return hash;
}

/**
 * ArrayBuffer를 16진수 문자열로 변환
 * @param buffer 
 * @returns 
 */
const _arrayBufferToHexString = (buffer: ArrayBuffer) => {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(value => {
      const hexCode = value.toString(16);
      const paddedHexCode = hexCode.padStart(2, '0');
      return paddedHexCode;
  });

  return hexCodes.join('');
}

/**
 * 랜덤한 문자열을 생성
 * @returns 
 */
export function generateRandomString(byteLength: number) {
  const array = new Uint8Array(byteLength);
  window.crypto.getRandomValues(array);
  return Array.from(array, hex => ('0' + hex.toString(16)).substr(-2)).join('');
}

/**
 * passphrase를 이용하여 key를 생성
 * @param passphrase 
 * @returns 
 */
export const getKeyFromPassphrase = async (passphrase: string) => {
  // 랜덤한 salt를 생성
  const salt = "saltForFile";
  const key = await _digestMessage(passphrase + salt);
  const keyHex = _arrayBufferToHexString(key);
  return keyHex
}

// // TODO: 랜덤한 salt를 생성하여 사용, 매개변수로 saltLength를 추가해도 됨(Unit8Array(saltLength))
// export const getKeyFromPassphrase = async (passphrase: string) => {
//   // Create a random salt
//   const salt = window.crypto.getRandomValues(new Uint8Array(16));
//   const saltString = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

//   // Add the salt to the passphrase and hash it
//   const key = await _digestMessage(passphrase + saltString);

//   const keyHex = _arrayBufferToHexString(key);

//   // Return the hashed passphrase and the salt
//   return { key: keyHex, salt: saltString };
// }

// TODO: BE에서처럼 iv를 랜덤하게 생성하고 파일의 맨 앞에 붙여서 전송
/**
 * iv를 랜덤하게 생성, passphrase와는 연관 X
 * @returns 
 */
export const getIvFromPassphrase = async () => {
  const ivHex = generateRandomString(16);
  return ivHex;
}

/**
 * AES 암호화
 * @param fileArrayBuffer 
 * @param keyHex 
 * @param ivHex 
 * @returns 
 */
export const encryptAes = async (fileArrayBuffer: ArrayBuffer, keyHex: string, ivHex: string) => {

  // decode the Hex-encoded key and IV
  const ivArrayBuffer = _arrayBufferFromHexString(ivHex);
  const keyArrayBuffer = _arrayBufferFromHexString(keyHex);

  // prepare the secret key for encryption
  const secretKey = await crypto.subtle.importKey('raw', keyArrayBuffer, {
      name: 'AES-CBC',
      length: 256
  }, true, ['encrypt', 'decrypt']);

  // encrypt the text with the secret key
  const ciphertextArrayBuffer = await crypto.subtle.encrypt({
      name: 'AES-CBC',
      iv: ivArrayBuffer
  }, secretKey, fileArrayBuffer);

  // iv와 암호화된 데이터를 합쳐서 반환
  const ivUint8Array = new Uint8Array(ivArrayBuffer);
  const ciphertextUint8Array = new Uint8Array(ciphertextArrayBuffer);
  const resultUint8Array = new Uint8Array(ivUint8Array.length + ciphertextUint8Array.length);

  resultUint8Array.set(ivUint8Array, 0);
  resultUint8Array.set(ciphertextUint8Array, ivUint8Array.length);

  return resultUint8Array.buffer;
}

/**
 * AES 복호화를 수행하는 함수
 * @param fileArrayBuffer 
 * @param keyHex 
 * @param ivHex 
 * @returns 
 */
// openssl enc -aes-256-cbc -nosalt -d -in test_car_encrypted_web.jpg -out test_car_enc_web_dec_openssl.jpg -K <key in Hex> -iv <iv in Hex>
export const decryptAes = async (fileArrayBuffer: ArrayBuffer, passphrase: string) => {
  // iv의 길이
  const ivLength = 16;

  // decode the Hex-encoded key and IV
  const ivArrayBuffer = fileArrayBuffer.slice(0, ivLength);
  const ciphertextArrayBuffer = fileArrayBuffer.slice(ivLength);

  // 키 생성
  const keyHex = await getKeyFromPassphrase(passphrase);
  const keyArrayBuffer = _arrayBufferFromHexString(keyHex);

  // prepare the secret key for encryption
  const secretKey = await crypto.subtle.importKey('raw', keyArrayBuffer, {
    name: 'AES-CBC',
    length: 256
}, true, ['encrypt', 'decrypt']);

  // decrypt the ciphertext with the secret key
  const decryptedBuffer = await crypto.subtle.decrypt({
      name: 'AES-CBC',
      iv: ivArrayBuffer
  }, secretKey, ciphertextArrayBuffer);

  // return the decrypted data as an ArrayBuffer
  return decryptedBuffer;
}








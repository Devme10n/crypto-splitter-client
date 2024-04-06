
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

  console.log('getKeyFromPassphrase func passphrase:', passphrase);  // 로그 추가

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
  console.log('생성된 IV:', ivHex);  // 로그 추가
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

  console.log('ivHex:', ivHex);  // 로그 추가
  console.log('keyHex:', keyHex);  // 로그 추가

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

function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * AES 복호화를 수행하는 함수
 * @param fileArrayBuffer 
 * @param keyHex 
 * @param ivHex 
 * @returns 
 */
// openssl enc -aes-256-cbc -nosalt -d -in test_car_encrypted_web.jpg -out test_car_enc_web_dec_openssl.jpg -K <key in Hex> -iv <iv in Hex>
// export const decryptAes = async (fileArrayBuffer: ArrayBuffer, passphrase: string) => {
//   // IV의 길이
//   const ivLength = 16;

//   // Hex 인코딩된 키와 IV를 디코드
//   const ivArrayBuffer = fileArrayBuffer.slice(0, ivLength);
//   const ciphertextArrayBuffer = fileArrayBuffer.slice(ivLength);

//   let keyHex;
//   try {
//     // 키 생성
//     keyHex = await getKeyFromPassphrase(passphrase);
//   } catch (err) {
//     console.error('키 생성 중 오류:', err);
//     throw err;
//   }

//   const keyArrayBuffer = _arrayBufferFromHexString(keyHex);

//   let secretKey;
//   try {
//     // 암호화를 위한 비밀 키 준비
//     secretKey = await crypto.subtle.importKey('raw', keyArrayBuffer, {
//       name: 'AES-CBC',
//       length: 256
//     }, true, ['encrypt', 'decrypt']);
//   } catch (err) {
//     console.error('키 가져오기 중 오류:', err);
//     throw err;
//   }

//   let decryptedBuffer;
//   try {
//     // 비밀 키로 암호문을 복호화
//     decryptedBuffer = await crypto.subtle.decrypt({
//         name: 'AES-CBC',
//         iv: ivArrayBuffer
//     }, secretKey, ciphertextArrayBuffer);
//   } catch (err) {
//     console.error('복호화 중 오류:', err);
//     throw err;
//   }

//   // 복호화된 데이터를 ArrayBuffer로 반환
//   return decryptedBuffer;
// }

export const decryptAes = async (fileArrayBuffer: ArrayBuffer, passphrase: string) => {
  // IV의 길이
  const ivLength = 16;

  // Hex 인코딩된 키와 IV를 디코드
  const ivArrayBuffer = fileArrayBuffer.slice(0, ivLength);
  const ciphertextArrayBuffer = fileArrayBuffer.slice(ivLength);
  console.log('decryptAes func passphrase:', passphrase);  // 로그 추가
  console.log('IV:', bufferToHex(ivArrayBuffer));  // 로그 추가
  // console.log('암호화된 데이터:', bufferToHex(ciphertextArrayBuffer));  // 로그 추가

  let keyHex;
  try {
    // 키 생성
    keyHex = await getKeyFromPassphrase(passphrase);
    console.log('생성된 키:', keyHex);  // 로그 추가
  } catch (err) {
    console.error('키 생성 중 오류:', err);
    throw err;
  }

  const keyArrayBuffer = _arrayBufferFromHexString(keyHex);
  console.log('디코딩된 키:', keyArrayBuffer);  // 로그 추가

  let secretKey;
  try {
    // 암호화를 위한 비밀 키 준비
    secretKey = await crypto.subtle.importKey('raw', keyArrayBuffer, {
      name: 'AES-CBC',
      length: 256
    }, true, ['encrypt', 'decrypt']);
    console.log('비밀 키:', secretKey);  // 로그 추가
  } catch (err) {
    console.error('키 가져오기 중 오류:', err);
    throw err;
  }

  let decryptedBuffer;
  try {
    // 비밀 키로 암호문을 복호화
    decryptedBuffer = await crypto.subtle.decrypt({
        name: 'AES-CBC',
        iv: ivArrayBuffer
    }, secretKey, ciphertextArrayBuffer);
    console.log('복호화된 버퍼:', decryptedBuffer);  // 로그 추가
  } catch (err) {
    console.error('복호화 중 오류:', err);
    throw err;
  }

  // 복호화된 데이터를 ArrayBuffer로 반환
  return decryptedBuffer;
}







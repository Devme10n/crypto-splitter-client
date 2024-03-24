/**
 * 16진수 문자열을 Uint8Array로 변환
 * @param hexString 
 * @returns 
 */
const uint8ArrayfromHexString = (hexString: string) =>Uint8Array.from(hexString.match(/.{1,2}/g).map((byte: any) => parseInt(byte, 16)));

/**
 * Base64 문자열을 ArrayBuffer로 변환
 * @param b64str 
 * @returns 
 */
function _base64StringToArrayBuffer(b64str) {
  const byteStr = atob(b64str)
  const bytes = new Uint8Array(byteStr.length)
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * ArrayBuffer를 Base64 문자열로 변환
 * @param arrayBuffer 
 * @returns 
 */
function _arrayBufferToBase64(arrayBuffer) {
  const byteArray = new Uint8Array(arrayBuffer);
  let byteString = '';
  for(let i=0; i < byteArray.byteLength; i++) {
      byteString += String.fromCharCode(byteArray[i]);
  }
  const b64 = window.btoa(byteString);

  return b64;
}

/**
 * PEM 형식의 문자열을 ArrayBuffer로 변환
 * @param pem 
 * @returns 
 */
function convertPemToBinary(pem) {
  const lines = pem.split('\n')
  let encoded = ''
  for(let i = 0;i < lines.length;i++){
    if (lines[i].trim().length > 0 &&
        lines[i].indexOf('-----BEGIN RSA PRIVATE KEY-----') < 0 &&
        lines[i].indexOf('-----BEGIN PUBLIC KEY-----') < 0 &&
        lines[i].indexOf('-----END RSA PRIVATE KEY-----') < 0 &&
        lines[i].indexOf('-----END PUBLIC KEY-----') < 0) {
      encoded += lines[i].trim()
    }
  }
  console.log('encoded', encoded)
  return _base64StringToArrayBuffer(encoded)
}

/**
 * 문자열에 새 줄을 추가
 * @param str 
 * @returns 
 */
function addNewLines(str) {
  let finalString = '';
  while(str.length > 0) {
      finalString += str.substring(0, 64) + '\n';
      str = str.substring(64);
  }

  return finalString;
}

/**
 * ArrayBuffer 형식의 개인키를 PEM 형식의 문자열로 변환
 * @param privateKey 
 * @returns 
 */
function toPrivatePem(privateKey: ArrayBuffer) {
  const b64 = addNewLines(_arrayBufferToBase64(privateKey));
  const pem = "-----BEGIN RSA PRIVATE KEY-----\n" + b64 + "-----END RSA PRIVATE KEY-----";
  
  return pem;
}

/**
 * ArrayBuffer 형식의 공개키를 PEM 형식의 문자열로 변환
 * @param privateKey 
 * @returns 
 */
function toPublicPem(privateKey: ArrayBuffer) {
  const b64 = addNewLines(_arrayBufferToBase64(privateKey));
  const pem = "-----BEGIN PUBLIC KEY-----\n" + b64 + "-----END PUBLIC KEY-----";
  
  return pem;
}

/**
 * RSA 암호화 알고리즘의 설정 정의
 */
const encryptAlgorithm = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  extractable: true,
  hash: {
    name: "SHA-256"
  }
}

/**
 * RSA 키 쌍 생성, PEM 형식의 문자열로 반환
 * @returns 
 */
export const generateRSAKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
      encryptAlgorithm,
      true,
      ["encrypt", "decrypt"]
    )
      
    const keyPairPem = {
      publicKey: '',
      privateKey: '',
    }
    const exportedPrivateKey = await window.crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    )
    keyPairPem.privateKey = toPrivatePem(exportedPrivateKey);
      
    const exportedPublicKey = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    )
    keyPairPem.publicKey = toPublicPem(exportedPublicKey);
      
  return keyPairPem;
}

/**
 * ArrayBuffer 형식의 파일과 PEM 형식의 공개키를 받아 RSA 암호화 실행, ArrayBuffer 반환
 * @param fileArrayBuffer 
 * @param pemString 
 * @returns ArrayBuffer
 */
export const encryptRsa = async (fileArrayBuffer: ArrayBuffer, pemString: string) => {
  
  const keyArrayBuffer = convertPemToBinary(pemString);
  // import public key
  const secretKey = await crypto.subtle.importKey('spki', keyArrayBuffer, encryptAlgorithm, true, ['encrypt']);
  // encrypt the text with the secret key
  const ciphertextArrayBuffer = await crypto.subtle.encrypt({
    name: 'RSA-OAEP',
  
  }, secretKey, fileArrayBuffer);
  
  console.log('ciphertextArrayBuffer', ciphertextArrayBuffer)

  return ciphertextArrayBuffer
}

/**
 * ArrayBuffer 형식의 파일과 PEM 형식의 개인키를 받아 RSA 복호화 실행, 복호화된 ArrayBuffer 반환
 * @param fileArrayBuffer 
 * @param pemString 
 * @returns ArrayBuffer
 */
export const decryptRsa = async (fileArrayBuffer: ArrayBuffer, pemString: string) => {
  
  
  const keyArrayBuffer = convertPemToBinary(pemString);

 
  const secretKey = await crypto.subtle.importKey('pkcs8', keyArrayBuffer, encryptAlgorithm, true, ['decrypt']);

  const decryptedBuffer = await crypto.subtle.decrypt({
    name: 'RSA-OAEP',

  }, secretKey, fileArrayBuffer);

  return decryptedBuffer;
}

/**
 * 문자열과 PEM 형식의 공개키를 받아 RSA 암호화 실행, Base64 문자열 반환
 * @param str 
 * @param pemString 
 * @returns 
 */
export const encryptStringRsa = async (str: string, pemString: string) => {
  const encodedPlaintext = new TextEncoder().encode(str).buffer;
  const encrypted = await encryptRsa(encodedPlaintext, pemString);
  return _arrayBufferToBase64(encrypted);
};

/**
 * 암호화된 문자열과 PEM 형식의 개인키를 받아 RSA 복호화 실행, 문자열 반환
 * @param str 
 * @param pemString 
 * @returns 
 */
export const decryptStringRsa = async (str: string, pemString: string) => {
  const encodedPlaintext = _base64StringToArrayBuffer(str);
  const decrypted = await decryptRsa(encodedPlaintext, pemString);
  const uint8Array = new Uint8Array(decrypted);
  const textDecoder = new TextDecoder();
  const decodedString = textDecoder.decode(uint8Array);
  return decodedString;
};

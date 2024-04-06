import { useEffect, useState } from "react";
import { generateRSAKeyPair, encryptStringRsa, decryptStringRsa } from "../utils/RSA_encryption";
import { isBase64 } from "../utils/Rgx_test";
import JSEncrypt from 'jsencrypt';

import {
  encryptAes,
  getKeyFromPassphrase,
  getIvFromPassphrase,
  decryptAes,
  generateRandomString
} from "../utils/AES_encryption";

import { is256BitHex } from "../utils/Rgx_test";

const RsaStringDecryptPage = () => {
  const [algorithm, setAlgorithm] = useState("AES256");
  const [aesKey, setAesKey] = useState("");
  const [aesIv, setAesIv] = useState("");
  const [decryptedString, setDecryptedString] = useState("");
  const [rsaKeyPair, setRsaKeyPair] = useState({
    publicKey: "",
    privateKey: "",
  });

  const [fileName, setFileName] = useState('');
  const [encryptedString, setEncryptedString] = useState("");

  /**
   * 입력한 파일명을 상태에 저장
   */
  const handleInputChange = (event) => {
    setFileName(event.target.value);
  };
  
  // TODO: merge & decrypt 최종 함수
  /**
   * 서버에 입력한 파일명을 POST 요쳥하여, 암호화된 파일과 암호화된 passphrase를 받아옴, passphrase를 개인키로 복호화, passphrase로 AES 키 생성, 암호화된 파일을 복호화, 복호화된 파일을 저장
   */
  // const fetchAndDecryptData = async () => {
  //   try {
  //     console.log("전송하는 파일이름: ", fileName)
  //     const response = await axios.post(`${import.meta.env.VITE_REACT_APP_SERVER_URL}/file`, {
  //       fileName
  //     });
  
  //     if (response.status === 200) {
  //       console.log("\nBE 이상 무\n")
  //       console.log(response.data);
  //       const { encryptedFile, encryptedPassphrase } = response.data;
  //       setEncryptedString(encryptedPassphrase);
  //       // RSA로 encryptedPassphrase 복호화
  //       const decryptedString = await decryptKeyRsa(encryptedString, rsaKeyPair.privateKey);

  //       // 복호화된 passphrase로부터 AES 키 생성
  //       if (!decryptedString) {
  //         throw new Error('decryptedString is undefined');
  //       }
        
  //       const keyHex = await getKeyFromPassphrase(decryptedString);
  //       setAesKey(keyHex);

  //       // AES-256-CBC로 encryptedFile 복호화
  //       const decryptedFile = new Blob([new Uint8Array(encryptedFile)]);
  //       decryptAes256(decryptedFile);

  //       // TODO: decryptedFile 처리
  //     } else {
  //       console.error(`Server responded with non-OK status for file: ${fileName}`);
  //       alert(`Failed to fetch encrypted data for file: ${fileName}`);
  //     }
  //   } catch (error) {
  //     console.error(`Error occurred while fetching encrypted data for file: ${fileName}`, error);
  //     alert(`Error occurred while fetching encrypted data for file: ${fileName}`);
  //   }
  // };
  const fetchAndDecryptData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_REACT_APP_SERVER_URL}/file`, {
          method: 'POST',
          body: JSON.stringify({ fileName }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const formData = await response.formData();
        const fileBlob = formData.get('file') as Blob;
        const encryptedPassphraseFile = formData.get('encryptedPassphrase') as File;
        let encryptedPassphrase = '';
        
        const reader = new FileReader();
        reader.onload = async function(event) {
          encryptedPassphrase = event.target.result as string;
        
          // RSA로 encryptedPassphrase 복호화
          if (encryptedPassphrase) {
            // encryptedPassphrase가 유효하지 않은 경우에 대한 처리 추가
            if (!encryptedPassphrase.trim()) {
              throw new Error('encryptedPassphrase is undefined or empty');
            }
  
            let decryptedString;
            try {
              // RSA로 encryptedPassphrase 복호화
              decryptedString = await decryptKeyRsa(encryptedPassphrase, rsaKeyPair.privateKey);
            } catch (error) {
              console.error('Error occurred while decrypting the passphrase', error);
              throw error;
            }
            // 복호화된 passphrase로부터 AES 키 생성
            if (!decryptedString) {
              throw new Error('decryptedString is undefined');
            }
            
            // const keyHex = await getKeyFromPassphrase(decryptedString);
            // setAesKey(keyHex);
            // console.log('keyHex', aesKey)
        
            // AES-256-CBC로 encryptedFile 복호화
            console.log(fileBlob)
            decryptAes256(fileBlob, decryptedString);
          } else {
            console.error('encryptedPassphrase is undefined');
          }
        };
        reader.readAsText(encryptedPassphraseFile);
      } catch (error) {
        console.error(`Error occurred while fetching encrypted data for file: ${fileName}`, error.message);
        alert(`Error occurred while fetching encrypted data for file: ${fileName}`);
      }
    };

  /**
   * 입력 파일을 AES-256-CBC로 복호화 후 파일로 저장
   */
  const decryptAes256 = (decryptedFile: Blob, passPharse: string) => {
    // console.log('aes-256 함수 실행은 됨')
    // console.log('decryptedFile: ', decryptedFile)
    // console.log('passPharse: ', passPharse)
    if (decryptedFile && (decryptedString || is256BitHex(aesKey))) {
      const reader = new FileReader();
      reader.onload = async function () {
        try{
          const arrayBuffer = reader.result as ArrayBuffer;
          const decrypted = await decryptAes(arrayBuffer, passPharse);
          console.log("decrypted: ", decrypted);
          // 파일로 저장
          saveOrOpenBlob(new Blob([decrypted]), decryptedFile.name || decrypted);
          // console.log('저장까지 잘 되네?')
        }catch(err){
          alert('decryptAes256 func Decryption failed')
        }
       
      };
      reader.readAsArrayBuffer(decryptedFile);
    } else {
      console.error('decryptedFile or aesKey is undefined');
    }
  };

  /**
   * Blob 데이터를 파일로 저장
   * @param blob 
   * @param fileName 
   */
  const saveOrOpenBlob = (blob: Blob, fileName: string) => {
    const tempEl = document.createElement("a");
    document.body.appendChild(tempEl);
    const url = window.URL.createObjectURL(blob);
    tempEl.href = url;
    tempEl.download = fileName;
    tempEl.click();
    window.URL.revokeObjectURL(url);
  };


  /**
   * 개인키 PEM 파일을 읽어, 상태를 업데이트
   * @param files 
   * @returns 
   */
  const changeFilePemPrivate = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }
    if (file.size > 1024 * 1024 * 50) {
      return alert("文件太大");
    }
    const reader = new FileReader();
    reader.onload = async function () {
      const privateKey = reader.result as string;
      setRsaKeyPair({
        ...rsaKeyPair,
        privateKey: privateKey,
      });
    };
    reader.readAsText(file);
  };

  /**
   * RSA로 암호화된 문자열을 복호화
   */
  const decryptKeyRsa = async (encryptedString: string, privateKey: string) => {
    if (!encryptedString) {
      throw new Error('Invalid argument: encryptedString must not be undefined');
    }
  
    try {
      const decryptor = new JSEncrypt();
      decryptor.setPrivateKey(privateKey);
      const decryptedKey = decryptor.decrypt(encryptedString);
  
      if (decryptedKey === null) {
        throw new Error('Decryption failed');
      }
  
      if (decryptedKey !== false) {
        setDecryptedString(decryptedKey);
      }      
      return decryptedKey;
    } catch (err) {
      alert('decryptKeyRsa func Decryption failed.');
    }
  };

  // /**
  //  * 입력 필드의 값이 변경될 때마다 상태 업데이트
  //  * @param e 
  //  */
  // const onKeyInputChange = async (e) => {
  //   setEncryptedString(e.target.value);
  // };

  return (
    <>
      <div className="flex flex-col items-center">
      <h1 className="pt-[20px] pb-[20px]">File Decrypt</h1>
        <div className="pt-[10px] text-left w-full flex-1">
          <div>
            <label
              htmlFor="small-input"
              className="whitespace-normal break-all font-bold block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Input Original Filename you want to decrypt
            </label>
            <input
              onChange={handleInputChange}
              type="text"
              id="small-input"
              className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 sm:text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
            {/* TODO: 파일명에 대한 유효성 검사가 필요한가?
            {encryptedString && !isBase64(encryptedString) && (
              <div className="text-red-500">Key must be valid Base64 string</div>
            )} */}
          </div>

          {/* <div>
            <label
              htmlFor="small-input"
              className="whitespace-normal break-all font-bold block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Input Encrypted AES256 key  (ex.
                SVtCR+N481hggkOrn63NQdrhcTI5BTrTKIxmGRXKgz6TxmmfcL/wI5BXYVmSd7h25bl6ZqGss6PekgEmkjwgtRFZAQldHOyVLQgM3jaqR9ytTG2667Qm/YabLkYcHEF6c126WxWrZ9j+IUCOOL7L5MZKjZ2oMIAhfULMie0q+DsyNfzoiUcZVQm6/dsj2QVb9JEchG3bd1ndAjzFKe1A+jmaWoD7r6JUrKtt4v1YmpbZZYazcIgndtPX935BoAFcovqBe3w/1k7MD8eUAe56I3GRd2AD5iKdnSPOrT7msKjUzRrJwd2DfLJI7W9ilKDq0REYUwVJNzuapVnWhJQalw==)
            </label>
            <input
              onChange={onKeyInputChange}
              type="text"
              id="small-input"
              className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 sm:text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
            {aesKey && !is256BitHex(aesKey) && (
              <div className="text-red-500">Key must be 256bit hex</div>
            )}
          </div> */}
          <div className="flex mt-[10px]">
            {/* <button
              type="button"
              onClick={generateRSAKey}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >
              Generate RSA Key
            </button>
            <button
              type="button"
              onClick={downloadPemFiles}
              className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
            >
              Download Pem Files
            </button> */}
            <div className="flex items-center justify-center">
              <label
                htmlFor="dropzone-file-pem-private"
                className="cursor-pointer text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
              >
                Import Private Key Pem File
                <input
                  id="dropzone-file-pem-private"
                  type="file"
                  className="hidden"
                  onChange={(e) => changeFilePemPrivate(e.target.files)}
                />
              </label>
            </div>

            {<button
              type="button"
              onClick={fetchAndDecryptData}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >
              Send File Name to Server
            </button>}
          </div>
          {rsaKeyPair && (rsaKeyPair.privateKey || rsaKeyPair.publicKey) && (
            <>
              <div className="text-left">
                <span className="font-bold">Encryption algorithm:</span>{" "}
                RSA-OAEP
              </div>
              <div className="text-left">
                <span className="font-bold">Modulus length:</span> 2048
              </div>
              <div className="text-left">
                <span className="font-bold">Hash:</span> SHA-256
              </div>
              <div className="flex">
                {rsaKeyPair.privateKey && (
                  <div className="flex-1">
                    <textarea
                      disabled
                      value={rsaKeyPair.privateKey}
                      id="message"
                      rows="6"
                      className="resize-none block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Write your thoughts here..."
                    ></textarea>
                  </div>
                )}
                {rsaKeyPair.publicKey && (
                  <div className="flex-1">
                    <textarea
                      disabled
                      value={rsaKeyPair.publicKey}
                      id="message"
                      rows="6"
                      className="resize-none block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Write your thoughts here..."
                    ></textarea>
                  </div>
                )}
              </div>
              {/* {(rsaKeyPair.privateKey && encryptedString && isBase64(encryptedString)) && (
                <>
                  <div className="flex mt-[10px]">
                    <button
                      type="button"
                      onClick={decryptKeyRsa}
                      className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                    >
                      Decrypt the input key with RSA
                    </button>
                  </div>
                  {decryptedString && (
                    <div className="break-all">
                    <span className="font-bold">Decrypted string: </span>{decryptedString}
                  </div>
                  )}
                  
                </>
              )} */}
            </>
          )}
        </div>
      </div>
    </>
  );
};


export default RsaStringDecryptPage;
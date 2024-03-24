
import { useEffect, useState } from "react";
import {
  encryptAes,
  getKeyFromPassphrase,
  getIvFromPassphrase,
  decryptAes,
  generateRandomString
} from "../utils/AES_encryption";
import { is256BitHex } from "../utils/Rgx_test";

import axios from "axios";

import { generateRSAKeyPair, encryptStringRsa } from "../utils/RSA_encryption";

function AesFileEncryptorPage() {
  const [inputFile, setInputFile] = useState(null);
  const [algorithm, setAlgorithm] = useState("AES256");
  const [passphrase, setPassphrase] = useState("");
  const [aesKey, setAesKey] = useState("");
  const [aesIv, setAesIv] = useState("");

  const [encryptedString, setEncryptedString] = useState("");
  const [rsaKeyPair, setRsaKeyPair] = useState({
    publicKey: "",
    privateKey: "",
  });

  /**
   * 파일 변경 이벤트 핸들러, AES 암호화 대상 파일 선택
   * 과거에 50MB 이상의 파일을 업로드를 제한했었음
   * @param files 
   * @returns 
   */
  const changeFile = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }
    // if (file.size > 1024 * 1024 * 50) {
    //   return alert("文件太大");
    // }
    // console.log(files);

    setInputFile(file);
    setTimeout(() => {
      document.getElementById("file-input-form").reset();
      step(2);
    }, 50);
  };

  /**
   * 알고리즘 변경 이벤트 핸들러
   * @param e 
   */
  const onAlgorithmChange = (e) => {
    setAlgorithm(e.target.value);
  };

  /**
   * passphrase 변경 이벤트 핸들러
   * @param e 
   */
  const onPassPhraseChange = (e) => {
    setPassphrase(e.target.value);
  };

  /**
   * 단계 이동 함수, 특정 단계로 스크롤 이동
   * @param stepNum 
   */
  const step = (stepNum: number) => {
    console.log("step");
    if (stepNum) {
      const nextStep = document.getElementById("step" + stepNum);
      if (nextStep) {
        nextStep.scrollIntoView({ behavior: "smooth" });
      } else {
        const step1 = document.getElementById("step1");
        if (step1) {
          step1.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      const step1 = document.getElementById("step1");
      if (step1) {
        step1.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // TODO: passpharse를 복호화하는 경우를 판단하지 못함. 해결 방법 간구해야함.
  /**
   * passphrase가 변경될 때마다 AesKey, iv를 생성 (바꿔야함)
   */
  useEffect(() => {
    const getAesKey = async () => {
      if (inputFile && !passphrase) {
        const passphrase = generateRandomString(32);
        setPassphrase(passphrase);
        const keyHex = await getKeyFromPassphrase(passphrase);
        setAesKey(keyHex);
      } else if (!inputFile) {
        setAesKey("");
      }
    };
    getAesKey();
  }, [inputFile]);
  
  useEffect(() => {
    const getAesIv = async () => {
      if (passphrase) {
        const ivHex = await getIvFromPassphrase();
        setAesIv(ivHex);
      } else {
        setAesIv("");
      }
    };
    getAesIv();
  }, [passphrase]);

  /**
   * 공개키 PEM 파일을 읽어, 상태를 업데이트
   * @param files 
   * @returns 
   */
  const changeFilePemPublic = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }
    if (file.size > 1024 * 1024 * 50) {
      return alert("文件太大");
    }
    const reader = new FileReader();
    reader.onload = async function () {
      const publicKey = reader.result as string;
      setRsaKeyPair({
        ...rsaKeyPair,
        publicKey: publicKey,
      });
    };
    reader.readAsText(file);
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
   * 입력된 문자열을 RSA 암호화
   */
  const encryptKeyRsa = async (passphrase: string, publicKey: string) => {
    try{
      const encryptedPassphrase = await encryptStringRsa(passphrase, publicKey);
      console.log(`encryptedPassphrase from encryptKeyRsa function: ${encryptedPassphrase}`)
      setEncryptedString(encryptedPassphrase);
      return encryptedPassphrase; // 암호화된 패스프레이즈 반환
    }catch(error){
      alert(`String Encryption failed. Error: ${error.message}`);
      console.log(`passpharse: ${passphrase}, publicKey: ${publicKey}`)
      console.log(`String Encryption failed. Error: ${error.message}`);
    }
  };

  /**
   * 입력 파일을 AES-256-CBC로 암호화 후 서버로 전송
   */
  const encryptAes256 = () => {
    if (inputFile && (passphrase || is256BitHex(aesKey))) {
      const reader = new FileReader();
      reader.onload = async function () {
        try{
          const encrypted = await encryptAes(
            reader.result as ArrayBuffer,
            aesKey,
            aesIv
          );
          // passpharse를 RSA로 암호화
          const encryptedPassphrase = await encryptKeyRsa(passphrase, rsaKeyPair.publicKey);
          // // 파일로 저장
          // saveOrOpenBlob(new Blob([encrypted]), inputFile.name || "encrypted");
          // 암호화된 데이터를 서버에 전송
          console.log(`encryptedPassphrase from encryptAes256 func before sendEncryptedData: ${encryptedPassphrase}`); // encryptedPassphrase 확인
          sendEncryptedData(new Blob([encrypted]), inputFile.name || "encrypted", encryptedPassphrase);
        }catch(err){
          console.log(err);
          alert('AES-256-CBC Encryption failed')
        }
        
      };
      reader.readAsArrayBuffer(inputFile);
    }
  };

  /**
   * 암호화된 파일과 암호화된 passphrase를 서버로 전송
   * @param encryptedBlob 
   */
  const sendEncryptedData = async (encryptedBlob: Blob, fileName: string, encryptedPassphrase: string) => {
    try {
      const encryptedFile = new File([encryptedBlob], fileName);

      console.log(`encryptedPassphrase: ${encryptedPassphrase}`); // encryptedPassphrase 확인
      console.log(`encryptedFile: ${encryptedFile}`); // encryptedFile 확인


      const formData = new FormData();
      formData.append('encryptedPassphrase', encryptedPassphrase);
      formData.append('encryptedFile', encryptedFile);

      const response = await axios.post(import.meta.env.VITE_REACT_APP_SERVER_URL + '/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 200) {
        alert('File and passphrase successfully uploaded.');
      } else {
        alert(`File upload failed with status code: ${response.status}`);
      }
    } catch (err) {
      alert(`File upload failed with error: ${err.message}`);
    }
  };

  // /**
  //  * 입력 파일을 AES-256-CBC로 복호화 후 파일로 저장
  //  */
  // const decryptAes256 = () => {
  //   if (inputFile && (passphrase || is256BitHex(aesKey))) {
  //     const reader = new FileReader();
  //     reader.onload = async function () {
  //       try{
  //         const decrypted = await decryptAes(
  //           reader.result as ArrayBuffer,
  //           aesKey
  //         );
  //         console.log(decrypted);
  //         // 파일로 저장
  //         saveOrOpenBlob(new Blob([decrypted]), inputFile.name || decrypted);
  //       }catch(err){
  //         alert('Decryption failed')
  //       }
       
  //     };
  //     reader.readAsArrayBuffer(inputFile);
  //   }
  // };

  // /**
  //  * Blob 데이터를 파일로 저장
  //  * @param blob 
  //  * @param fileName 
  //  */
  // const saveOrOpenBlob = (blob: Blob, fileName: string) => {
  //   const tempEl = document.createElement("a");
  //   document.body.appendChild(tempEl);
  //   const url = window.URL.createObjectURL(blob);
  //   tempEl.href = url;
  //   tempEl.download = fileName;
  //   tempEl.click();
  //   window.URL.revokeObjectURL(url);
  // };

  return (
    <>
      <div className="min-w-[1200px]">
        <div  className="h-[100vh] relative">
          <h1 className="pt-[20px] pb-[20px]">File Encrypt & Split</h1>
          <form
            id="file-input-form"
            className="pt-[20px] flex items-center justify-center w-full"
          >
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 16"
                >
                  <path
                    stroke="currentColor"
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Any file
                </p>
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                onChange={(e) => changeFile(e.target.files)}
              />
            </label>
          </form>
        </div>

        {inputFile && (
          <>
            <div id="step2" className="h-[100vh] relative">
              <button
                onClick={() => step(1)}
                type="button"
                className="mt-[10px] text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center mr-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                <svg
                  className="w-4 h-4 rotate-[270deg]"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 10"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    strokeWidth="2"
                    d="M1 5h12m0 0L9 1m4 4L9 9"
                  />
                </svg>
                <span className="sr-only">Icon description</span>
              </button>
              <div className="pt-[10px]">
                <div className="text-left">
                  <div>
                    <span className="font-bold">File name:</span>{" "}
                    {inputFile.name}
                  </div>
                  <div>
                    <span className="font-bold">Last modified date:</span>{" "}
                    {inputFile.lastModifiedDate.toString()}
                  </div>
                  <div>
                    <span className="font-bold">Size:</span> {inputFile.size}
                  </div>
                  <div>
                    <span className="font-bold">Type:</span> {inputFile.type}
                  </div>
                </div>
              </div>
              <div className="pt-[10px] flex gap-[10px]">
               
              </div>
              {algorithm === "AES256" && inputFile && (
                <>
                  <div className="pt-[10px] text-left">
                    {/* {((!passphrase && !aesKey) || passphrase) && (
                      <div>
                        <label
                          htmlFor="small-input"
                          className="font-bold block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                        >
                          Input passphrase (ex. 123456)
                        </label>
                        <input
                          onChange={onPassPhraseChange}
                          type="text"
                          id="small-input"
                          className="block w-full p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 sm:text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        />
                      </div>
                    )} */}

                    {(passphrase || aesKey) && (
                      <>
                        <div className="pt-[20px]">
                          <div>
                            <span className="font-bold">
                              Encryption algorithm:
                            </span>{" "}
                            AES-CBC
                          </div>
                          {passphrase && (
                            <div>
                              <span className="font-bold">Key algorithm:</span>{" "}
                              (Passphrase + Salt) SHA256
                            </div>
                          )}

                          <div>
                            <span className="font-bold">
                              Key (hex)(256bit):
                            </span>{" "}
                            {aesKey}
                          </div>
                          {/* <div>
                            <span className="font-bold">Salt:</span> {" "}
                            {aesSalt}
                          </div>                           */}
                          <div>
                            <span className="font-bold">Iv algorithm:</span> RandomString(16)
                          </div>
                          <div>
                            <span className="font-bold">Iv (hex)(128bit):</span>{" "}
                            {aesIv}
                          </div>
                          <div>
                            <span className="font-bold">Padding :</span> PKCS#7
                          </div>
                        </div>
                        <div className="pt-[20px]">
                          <button
                            type="button"
                            onClick={encryptAes256}
                            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                          >
                            Encrypt
                          </button>

                          <label
                            htmlFor="dropzone-file-pem-public"
                            className="cursor-pointer text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                          >
                            Import Public Key Pem File
                            <input
                              id="dropzone-file-pem-public"
                              type="file"
                              className="hidden"
                              onChange={(e) => changeFilePemPublic(e.target.files)}
                            />
                          </label>

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
                          
                          {/* <button
                            type="button"
                            onClick={decryptAes256}
                            className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                          >
                            Decrypt
                          </button> */}
                        <div>
                          <span className="font-bold">Openssl Equivalent:</span>
                        </div>
                        <div>
                          <span className="font-bold">Encrypt:</span> openssl
                          enc -aes-256-cbc -nosalt -e -in input.jpg -out
                          output.jpg -K {aesKey} -iv {aesIv}
                        </div>
                        <div>
                          <span className="font-bold">Decrypt:</span> openssl
                          enc -aes-256-cbc -nosalt -d -in input.jpg -out
                          output.jpg -K {aesKey} -iv {aesIv}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              {/* dell */}
              {algorithm === "RSA" && inputFile && (
                <RsaKeyEncrypt/>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default AesFileEncryptorPage;

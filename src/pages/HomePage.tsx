import {  useSearchParams } from "react-router-dom";
import  AesFileEncryptPage from "./FileEncryptAndSplitPage";
import RsaKeyEncryptPage from "./RsaKeyManagementPage";
import RsaKeyDecryptPage from "./FileMergeAndDecryptPage";
const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <>
    
      {(!searchParams.get('page') || searchParams.get('page') === "aes_file_encrypt") && <AesFileEncryptPage/>}
      { searchParams.get('page') === "rsa_key_encrypt" && <RsaKeyEncryptPage/>}
      { searchParams.get('page') === "rsa_key_decrypt" && <RsaKeyDecryptPage/>}
      
    </>
  );
}

export default HomePage;
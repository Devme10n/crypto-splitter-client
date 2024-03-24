import { Link, useParams, useSearchParams, BrowserRouter } from "react-router-dom";
const Header = () => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <>
      <div id="step1" className="flex gap-4 bg-blue-500 w-full h-[70px] items-center pl-[20px] text-white">
     
        <Link className={`text-white hover:text-white ${!searchParams.get('page') || searchParams.get('page') === "aes_file_encrypt" ? 'border-b-2' : ''}`} to="/?page=aes_file_encrypt">
          File Encrypt & Split
        </Link>
        <Link className={`text-white hover:text-white ${searchParams.get('page') === "rsa_key_encrypt" ? 'border-b-2' : ''}`} to="/?page=rsa_key_encrypt">
          Rsa Key Management Page
        </Link>
        <Link className={`text-white hover:text-white ${searchParams.get('page') === "rsa_key_decrypt" ? 'border-b-2' : ''}`} to="/?page=rsa_key_decrypt">
          File Merge & Decrypt
        </Link>
     
      </div>
      
    </>
  )
}

export default Header
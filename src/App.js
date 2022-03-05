import { useEffect, useState } from 'react';
import './styles.css';
import { ethers } from 'ethers';

import contractAbi from './utils/contractABI';
import { networks } from './utils/networks';
import { ReactComponent as Coder } from './assets/coder.svg';
import { ReactComponent as PolygonIcon } from './assets/polygon.svg';
import { ReactComponent as EthIcon } from './assets/ethereum.svg';

const TWITTER_HANDLE = 'kharioki';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// domain to mint
const tld = '.kot';
const CONTRACT_ADDRESS = '0x2aC881DFF6d20929D75cF0Ab8e9D52574949F6a5';

function App() {
  const [currentAccount, setCurrentAccount] = useState('');
  const [domain, setDomain] = useState('');
  const [record, setRecord] = useState('');
  const [network, setNetwork] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mints, setMints] = useState([]);

  const connectWallet = async () => {
    try {
      const provider = window.ethereum;

      if (!provider) {
        alert('Please install MetaMask -> https://metamask.io/');
        return;
      }
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      console.log('Connected to MetaMask', accounts);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        // Try to switch to the Mumbai testnet
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
        });
      } catch (error) {
        // This error code means that the chain we want has not been added to MetaMask
        // In this case we ask the user to add it to their MetaMask
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x13881',
                  chainName: 'Polygon Mumbai Testnet',
                  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                  nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18
                  },
                  blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
                },
              ],
            });
          } catch (error) {
            console.log(error);
          }
        }
        console.log(error);
      }
    } else {
      // If window.ethereum is not found then MetaMask is not installed
      alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
    }
  }

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log('Make sure metamask is installed');
      return;
    } else {
      console.log('We have the ethereum object');
    }

    // Check if we're authorized to access the user's wallet
    const accounts = await ethereum.request({ method: 'eth_accounts' });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log('Found an authorized account: ', account);
      setCurrentAccount(account);
    } else {
      console.log('No authorized accounts found');
    }

    const chainId = await ethereum.request({ method: 'eth_chainId' });
    setNetwork(networks[chainId]);

    ethereum.on('chainChanged', handleChainChanged);

    function handleChainChanged(_chainId) {
      window.location.reload();
    };
  }

  const fetchMints = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        // You know all this
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

        // Get all the domain names from our contract
        const names = await contract.getAllNames();

        // For each name, get the record and the address
        const mintRecords = await Promise.all(names.map(async (name) => {
          const mintRecord = await contract.records(name);
          const owner = await contract.domains(name);
          return {
            id: names.indexOf(name),
            name: name,
            record: mintRecord,
            owner: owner,
          };
        }));

        console.log("MINTS FETCHED ", mintRecords);
        setMints(mintRecords);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const mintDomain = async () => {
    // Don't run if domain is empty
    if (!domain) { return }
    // Alert user if domain is too short
    if (domain.length < 3) {
      alert('Domain is too short. Must be at least 3 characters long');
      return;
    }

    setLoading(true);

    // Calculate price based on length of domain: 3chars = 0.5 MATIC ? 4chars = 0.3 : 0.1, etc
    const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
    console.log('Minting domain ', domain, 'with price ', price);

    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

        console.log('Pop wallet to pay gas...');
        let tx = await contract.register(domain, { value: ethers.utils.parseEther(price) });
        // wait for the transaction to be minted
        const receipt = await tx.wait();
        // check if transaction was successful
        if (receipt.status === 1) {
          console.log('Domain minted successfully! https://mumbai.polygonscan.com/tx/' + tx.hash);

          // Set the record for the domain
          tx = await contract.setRecord(domain, record);
          await tx.wait();

          console.log('Record set! https://mumbai.polygonscan.com/tx/' + tx.hash);

          setTimeout(() => {
            fetchMints();
          }, 1000);

          setLoading(false);
          setRecord('');
          setDomain('');
        } else {
          alert('Domain minting failed. Please try again.');
          setLoading(false);
        }
      }
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

  const updateDomain = async () => {
    if (!record || !domain) { return }
    setLoading(true);
    console.log("Updating domain", domain, "with record", record);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

        let tx = await contract.setRecord(domain, record);
        await tx.wait();
        console.log("Record set https://mumbai.polygonscan.com/tx/" + tx.hash);

        fetchMints();
        setRecord('');
        setDomain('');
        setEditing(false);
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (network === 'Polygon Mumbai Testnet') {
      fetchMints();
    }
  }, [currentAccount, network]);

  const renderConnectWalletButton = () => (
    <div className="flex justify-center">
      <button
        className="flex items-center px-4 mx-8 my-4 rounded-md border-2 border-purple-500 py-2 dark:text-white hover:text-white hover:bg-purple-500"
        onClick={connectWallet}>
        Connect Wallet
      </button>
    </div>
  );

  const renderInput = () => {
    if (network !== 'Polygon Mumbai Testnet') {
      return (
        <div className="flex flex-col items-center justify-center">
          <p className="text-purple-500 text-md font-bold right-4 mx-4">
            Please connect to the Polygon Mumbai Testnet
          </p>
          <button
            className="flex items-center px-2 mx-2 my-2 rounded-md border-2 border-purple-500 py-2 text-purple-500 hover:text-white hover:bg-purple-700"
            onClick={switchNetwork}>
            Click here to switch
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center px-4">
        <div className="flex relative mx-auto w-full md:w-3/4 lg:w-1/2 items-center">
          <input
            className="w-full px-4 py-2 my-4 mx-4 text-xs sm:text-sm focus:outline-none rounded-md border-2 border-purple-500 dark:border-gray-900 dark:text-gray-400 dark:bg-gray-900"
            type="text"
            placeholder="Domain name(min 3, max 12 chars)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="text-purple-500 text-sm sm:text-md font-bold absolute right-4 mx-4">
            {tld}
          </p>
        </div>

        <p className='text-xs sm:text-sm dark:text-gray-400'>Let's set the first record, your twitter handle perhaps. We'll add more records later.</p>

        <div className="flex relative mx-auto w-full md:w-3/4 lg:w-1/2 items-center">
          <input
            className="w-full px-4 py-2 my-4 mx-4 text-xs sm:text-sm focus:outline-none rounded-md border-2 border-purple-500 dark:border-gray-900 dark:text-gray-400 dark:bg-gray-900"
            type="text"
            placeholder="What is your twitter handle? e.g @johndoe"
            value={record}
            onChange={(e) => setRecord(e.target.value)}
          />
        </div>

        {loading && (
          <div className="flex justify-center">
            <svg role="status" className="inline mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
            </svg>
          </div>
        )}

        <div className="flex justify-center">
          {editing ? (
            <div className="flex justify-center">
              <button
                className="flex items-center px-4 mx-8 my-4 rounded-md border-2 border-purple-500 bg-purple-500 py-2 text-white hover:text-white hover:bg-purple-700"
                disabled={loading}
                onClick={updateDomain}>
                Set record
              </button>
              <button
                className="flex items-center px-4 mx-8 my-4 rounded-md border-2 border-purple-500 bg-purple-500 py-2 text-white hover:text-white hover:bg-purple-700"
                disabled={loading}
                onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="flex items-center px-4 mx-8 my-2 rounded-md border-2 border-purple-500 bg-purple-500 text-white hover:text-white hover:bg-purple-700"
              disabled={loading}
              onClick={mintDomain}>
              Mint domain
            </button>
          )}
        </div>

        <p className='text-xs dark:text-gray-400'>
          Remember your domain is basically an NFT. Hence the "mint" vocabulary...
        </p>
      </div>
    )
  };

  const renderMints = () => (
    mints.length > 0 ? (
      <div className="flex flex-col justify-center mt-5 py-4 w-full">
        <div className="flex mx-4 px-4 my-4">
          <p className="text-xs sm:text-sm text-gray-500">
            Here are some cool domains already minted...
          </p>
        </div>
        <div className="flex px-4 overflow-x-scroll pb-10 hide-scroll-bar justify-start py-4 w-full">
          {mints.map((mint, index) => (
            <div className="card" key={index}>
              <p className="text-sm text-purple-400 my-2">
                {mint.name}{tld}
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                {mint.record}
              </p>
              {mint.owner.toLowerCase() === currentAccount.toLowerCase() ? (
                <button
                  className="flex items-center right-0 px-4 mx-4 my-4 py-1 rounded-md border-2 border-purple-500 bg-white text-purple-300 hover:text-white hover:bg-purple-700 dark:border-gray-900 dark:text-gray-400 dark:bg-gray-900"
                  disabled={loading}
                  onClick={() => editRecord(mint.name)}>
                  <p className='text-xs'>Edit</p>
                  <div className='mx-2 text-xs'>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="flex flex-col justify-center mt-5 py-4 w-full">
        <div className="flex">
          <p className="text-xs sm:text-sm text-gray-400">
            No domains minted yet...
          </p>
        </div>
      </div>
    )
  );

  const editRecord = (name) => {
    console.log('Editing record for', name);
    setEditing(true);
    setDomain(name);
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <div className='flex flex-1 flex-col min-h-screen font-mono text-gray-500'>
      <nav className='flex justify-between w-full drop-shadow-sm border-b border-purple-50 dark:border-gray-600 dark:bg-gray-800'>
        <div className='flex justify-between items-center'>
          <h1 className='text-3xl font-bold p-4 text-purple-500 tracking-wide hover:text-purple-700'>
            .kot
          </h1>
        </div>

        <div className='flex justify-between items-center h-10 sm:right-4 mt-4'>
          {network.includes("Polygon") ? <PolygonIcon className='w-4 h-4 sm:w-6 sm:h-6' /> : <EthIcon className='w-4 h-4 sm:w-6 sm:h-6' />}
          {currentAccount ? <p className='mx-2 sm:mx-4 text-xs sm:text-lg dark:text-gray-300'>Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</p> : <p className='mx-2 sm:mx-4 text-xs sm:text-lg'>Not connected</p>}
        </div>
      </nav>

      <main className='flex flex-col w-full flex-1 sm:px-12 xl:px-24 py-2 sm:py-4 text-center dark:bg-gray-800'>
        <div className="flex justify-center">
          <div className="flex items-center px-4 mx-4 rounded-md bg-purple-500 py-6 shadow-md">
            <div className="flex flex-col">
              <span className="font-bold md:text-3xl text-xl text-white">
                Grab your <a href="/" className='underline decoration-yellow-200 text-yellow-200'>.kot</a> domain today!!!
              </span>
              <p className="text-white text-xs sm:text-sm mt-5 leading-loose">
                "The domain .kot was inspired by my favorite community
                <span className='mx-2 before:block before:absolute before:-inset-1 before:-skew-y-2 before:bg-blue-300 relative inline-block'>
                  <span className='relative text-white font-bold'>Kenyans on Twitter</span>
                </span>.
                It's a domain that I created to help people find their favorite people on Twitter. I hope you enjoy it!"
              </p>
              <p className="text-white text-sm text-right mr-4">
                <a href={TWITTER_LINK} target="_blank" rel='noreferrer' className='text-blue-300 font-bold hover:text-white'>- @{TWITTER_HANDLE}</a>
              </p>
            </div>
          </div>
        </div>
        {/**  connect wallet button  */}
        {!currentAccount && renderConnectWalletButton()}
        {/**  render input form if an account is connected  */}
        {currentAccount && renderInput()}

        {/**  render mints if an account is connected  */}
        {currentAccount && renderMints()}

        <div className="flex justify-center py-4 w-full">
          <div className="flex flex-col md:flex-row md:justify-between items-center px-4 mx-4 rounded-md py-6">
            <div className="flex flex-col w-full md:w-1/3 justify-center px-4">
              <span className="font-bold md:text-md text-sm text-purple-400 tracking-wide">
                Why add records?
              </span>
              <p className='text-xs sm:text-md mt-5 dark:text-gray-400 leading-loose tracking-wide'>
                The whole point of a domain is to direct people to your place on the internet. You can set the data you want shown on your domain.
              </p>
            </div>

            <div className="flex justify-center md:col-span-2">
              <Coder />
            </div>
          </div>
        </div>

      </main>

      <footer className="flex items-center justify-center w-full h-8 sm:h-12 border-t border-purple-100 dark:border-gray-600 dark:bg-gray-800">
        <p className="text-white text-sm">
          <a href={TWITTER_LINK} target="_blank" rel='noreferrer' className='text-gray-500 font-bold hover:text-purple-500'>- built by @{TWITTER_HANDLE}</a>
        </p>
      </footer>
    </div>
  );
}

export default App;

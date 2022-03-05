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
const CONTRACT_ADDRESS = '0xf773770cb3288772F99468D55775CE04f9612bd8';

function App() {
  const [currentAccount, setCurrentAccount] = useState('');
  const [domain, setDomain] = useState('');
  const [record, setRecord] = useState('');
  const [network, setNetwork] = useState('');

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
      console.log('We have the ethereum object', ethereum);
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

  const mintDomain = async () => {
    // Don't run if domain is empty
    if (!domain) { return }
    // Alert user if domain is too short
    if (domain.length < 3) {
      alert('Domain is too short. Must be at least 3 characters long');
      return;
    }

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

          setRecord('');
          setDomain('');
        } else {
          alert('Domain minting failed. Please try again.');
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

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
            className="w-full px-4 py-2 my-4 mx-4 focus:outline-none rounded-md border-2 border-purple-500 dark:text-white"
            type="text"
            placeholder="Enter domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="text-purple-500 text-md font-bold absolute right-4 mx-4">
            {tld}
          </p>
        </div>
        <p className='text-xs sm:text-sm'>Let's set the first record, your twitter handle perhaps. We'll add more records later.</p>

        <div className="flex relative mx-auto w-full md:w-3/4 lg:w-1/2 items-center">
          <input
            className="w-full px-4 py-2 my-4 mx-4 focus:outline-none rounded-md border-2 border-purple-500 dark:text-white"
            type="text"
            placeholder="What is your twitter handle?"
            value={record}
            onChange={(e) => setRecord(e.target.value)}
          />
        </div>

        <div className="flex justify-center">
          <button
            className="flex items-center px-4 mx-8 my-4 rounded-md border-2 border-purple-500 bg-purple-500 py-2 text-white hover:text-white hover:bg-purple-700"
            onClick={mintDomain}>
            Mint domain
          </button>
        </div>
      </div>
    )
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
          {currentAccount ? <p className='mx-2 sm:mx-4 text-xs sm:text-lg'>Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</p> : <p className='mx-2 sm:mx-4 text-xs sm:text-lg'>Not connected</p>}
        </div>
      </nav>

      <main className='flex flex-col w-full flex-1 sm:px-12 xl:px-24 sm:py-4 text-center dark:bg-gray-800'>
        <div className="flex justify-center">
          <div className="flex items-center px-4 mx-4 rounded-md bg-purple-500 py-6 shadow-md">
            <div className="flex flex-col justify-center">
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
              <p className="text-white text-sm mt-5">
                <a href={TWITTER_LINK} target="_blank" rel='noreferrer' className='text-blue-300 font-bold hover:text-white'>- @{TWITTER_HANDLE}</a>
              </p>
            </div>
          </div>
        </div>
        {/**  connect wallet button  */}
        {!currentAccount && renderConnectWalletButton()}
        {/**  render input form if an account is connected  */}
        {currentAccount && renderInput()}

        <div className="flex justify-center py-4">
          <div className="flex flex-col md:flex-row md:justify-between items-center px-4 mx-4 rounded-md py-6">
            <div className="flex flex-col w-full md:w-1/3 justify-center px-4 mx-4">
              <span className="font-bold md:text-md text-sm text-purple-500">
                Why add records?
              </span>
              <p className='text-xs sm:text-md mt-5'>
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

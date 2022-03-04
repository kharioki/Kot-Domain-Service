import './styles.css';

const TWITTER_HANDLE = 'kharioki';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

function App() {
  return (
    <div className='flex flex-1 flex-col min-h-screen font-mono text-gray-500'>
      <nav className='flex justify-between w-full drop-shadow-sm border-b border-purple-50 dark:border-purple-50 dark:bg-gray-800'>
        <div className='flex justify-between items-center'>
          <h1 className='text-3xl font-bold p-4 text-purple-500 tracking-wide hover:text-purple-700'>
            .kot
          </h1>
        </div>
      </nav>

      <main className='flex flex-col w-full flex-1 sm:px-12 xl:px-24 sm:py-6 text-center dark:bg-gray-800'>
        <div class="flex justify-center">
          <card class="flex items-center px-8 mx-8 rounded-md bg-purple-500 py-6">
            <div class="flex flex-col justify-center">
              <span class="font-bold text-3xl text-white mt-2">
                Grab your <a href="/" className='underline decoration-yellow-200 text-yellow-200'>.kot</a> domain today!!!
              </span>
              <p class="text-white text-sm mt-5">
                "The domain .kot was inspired by my favorite community <span className='text-blue-300 font-bold'>Kenyans on Twitter</span>. It's a domain that I created to help people find their favorite people on Twitter. I hope you enjoy it!"
              </p>
              <p class="text-white text-sm mt-5">
                <a href={TWITTER_LINK} className='text-blue-300 font-bold'>- @{TWITTER_HANDLE}</a>
              </p>
            </div>
          </card>
        </div>
      </main>
    </div>
  );
}

export default App;

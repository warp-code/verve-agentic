import { useLocation } from "react-router";
import WalletBalance from "./WalletBalance";

const Home = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const walletAddress = queryParams.get("wallet");

  if (!walletAddress) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-gray-500">
          Please provide a wallet address in the URL query parameters (e.g.,
          ?wallet=YourSolanaAddress)
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="mb-8 text-2xl font-bold">Verve Wallet Explorer</h1>
      <h2 className="text-md font-semibold">Wallet Address:</h2>
      <h2 className="text-md mb-8 font-semibold">{walletAddress}</h2>
      <WalletBalance walletAddress={walletAddress} />
    </main>
  );
};

export default Home;

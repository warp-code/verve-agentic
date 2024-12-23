import { useWallet } from "@solana/wallet-adapter-react";
import { Route, Routes } from "react-router";
import Home from "./Home";

export default function Main() {
  const { connected } = useWallet();

  return (
    <main
      className={
        "mt-18 flex h-full w-full flex-grow justify-center px-8 py-8 sm:px-16" +
        (!connected ? " items-center" : "")
      }
    >
      {connected ? (
        <div className="mx-auto w-full max-w-4xl">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl">
          <div className="w-full rounded-md bg-white p-8 text-center shadow">
            <h3 className="text-xl font-semibold">
              Connect your wallet to continue
            </h3>
          </div>
        </div>
      )}
    </main>
  );
}

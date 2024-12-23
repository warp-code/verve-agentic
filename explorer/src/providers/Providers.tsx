import { ReactNode } from "react";
import { BrowserRouter } from "react-router";
import WalletContextProvider from "./WalletContextProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <WalletContextProvider>{children}</WalletContextProvider>
    </BrowserRouter>
  );
}

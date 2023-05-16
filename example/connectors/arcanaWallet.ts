import { initializeConnector } from "@web3-react/core";
import { ArcanaConnector } from "@arcana/auth-web3-react";
import { AuthProvider } from "@arcana/auth";
import { URLS } from "../chains";

const auth = new AuthProvider(
  "xar_test_b2dde12aad64eb35d72b2c80926338e178b1fa3f"
);
export const [arcanaConnect, hooks] = initializeConnector<ArcanaConnector>(
  (actions) =>
    new ArcanaConnector(auth, {
      actions,
    })
);

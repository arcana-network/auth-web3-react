import { Connector } from "@web3-react/types";
import type {
  Actions,
  Provider,
  ProviderConnectInfo,
  ProviderRpcError,
} from "@web3-react/types";
import type { AuthProvider, EthereumProvider } from "@arcana/auth";

function parseChainId(chainId: string | number) {
  return typeof chainId === "string" ? Number.parseInt(chainId, 16) : chainId;
}

export class ArcanaConnector extends Connector {
  readonly id = "arcana-auth";
  readonly name = "Arcana Auth";
  private auth: AuthProvider;
  public provider?: Provider;

  constructor({ auth, actions }: { auth: AuthProvider; actions: Actions }) {
    super(actions);
    this.auth = auth;
    this.provider = this.auth.provider;

    this.provider.on("connect", this.connectListener);
    this.provider.on("disconnect", this.disconnectListener);
    this.provider.on("chainChanged", this.chainChangedListener);
    // this.provider.on("accountsChanged", this.accountsChangedListener);
  }

  private disconnectListener = (error: ProviderRpcError) => {
    this.actions.resetState();
    if (error) this.onError?.(error);
  };

  private connectListener = async ({
    chainId,
  }: ProviderConnectInfo): Promise<void> => {
    console.log("connected");
    const accounts = (await this.provider?.request({
      method: "eth_accounts",
    })) as string[];
    this.actions.update({ chainId: parseChainId(chainId), accounts });
  };

  private chainChangedListener = (chainId: string): void => {
    console.log({ chainId });
    this.actions.update({ chainId: Number.parseInt(chainId, 16) });
  };

  private accountsChangedListener = (accounts: string[]): void => {
    console.log({ accounts });
    this.actions.update({ accounts });
  };

  public async connectEagerly(): Promise<void> {
    await this.auth.init();
    if (await this.auth.isLoggedIn()) {
      if (!this.auth.connected) {
        await new Promise((resolve) =>
          this.auth.provider.on("connect", resolve)
        );
      }
    }
    return;
  }

  async activate(): Promise<void> {
    this.auth.connect().then((provider: EthereumProvider) => {
      provider
        .request({ method: "eth_requestAccounts" })
        .catch(() => provider.request({ method: "eth_accounts" })) as Promise<
        string[]
      >;
    });
  }

  public async deactivate(): Promise<void> {
    await this.auth.logout();
    this.provider?.removeListener("disconnect", this.disconnectListener);
    this.provider?.removeListener("chainChanged", this.chainChangedListener);
    // this.provider?.removeListener(
    //   "accountsChanged",
    //   this.accountsChangedListener
    // );
    this.provider?.removeListener("connect", this.connectListener);
    this.actions.resetState();
  }
}

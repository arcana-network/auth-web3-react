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
interface LoginType {
  provider: string;
  email?: string;
}

export class ArcanaConnector extends Connector {
  readonly id = "arcana";
  readonly name = "Arcana Auth";
  private auth: AuthProvider;
  private login?: LoginType;
  public provider?: Provider;

  constructor(
    auth: AuthProvider,
    { actions, login }: { login?: LoginType; actions: Actions }
  ) {
    super(actions);
    this.auth = auth;
    this.provider = this.auth.provider;
    this.login = login;
    this.provider.on("connect", this.connectListener);
    this.provider.on("disconnect", this.disconnectListener);
    this.provider.on("chainChanged", this.chainChangedListener);
    // this.provider.on("accountsChanged", this.accountsChangedListener);
  }

  setLogin(login: LoginType) {
    this.login = login;
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
    let provider: EthereumProvider | undefined;

    if (this.login) {
      if (this.login.provider === "passwordless") {
        if (this.login.email) {
          provider = await this.auth.loginWithLink(this.login.email);
        } else {
          throw new Error("email is required for passwordless login");
        }
      } else {
        provider = await this.auth.loginWithSocial(this.login.provider);
      }
    } else {
      provider = await this.auth.connect();
    }
    // const provider =
    // .then((provider: EthereumProvider) => {
    provider
      .request({ method: "eth_requestAccounts" })
      .catch(() => provider?.request({ method: "eth_accounts" })) as Promise<
      string[]
    >;
    // });
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

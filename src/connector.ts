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
  public provider: Provider;
  private attached = false;

  constructor(
    auth: AuthProvider,
    { actions, login }: { login?: LoginType; actions: Actions }
  ) {
    super(actions);
    this.auth = auth;
    this.provider = this.auth.provider;
    this.login = login;
    this.addListeners();
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
    this.addListeners();
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

  private addListeners() {
    if (!this.attached) {
      this.attached = true;
      this.provider.on("connect", this.connectListener);
      this.provider.on("disconnect", this.disconnectListener);
      this.provider.on("chainChanged", this.chainChangedListener);
    }
  }
  private removeListeners() {
    if (this.attached) {
      this.provider.removeListener("connect", this.connectListener);
      this.provider.removeListener("disconnect", this.disconnectListener);
      this.provider.removeListener("chainChanged", this.chainChangedListener);
      this.attached = false;
    }
  }

  async activate(): Promise<void> {
    this.addListeners();
    let provider: EthereumProvider | undefined;
    await this.auth.init();
    if (await this.auth.isLoggedIn()) {
      if (!this.auth.connected) {
        await new Promise((resolve) =>
          this.auth.provider.on("connect", resolve)
        );
      }
      return;
    }
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
    this.removeListeners();
    this.actions.resetState();
  }
}

import { BaseProvider, Network } from "@ethersproject/providers";

import { promiseWithTimeout } from "../utils/promises";

export enum FallbackProviderError {
  NO_PROVIDER = "At least one provider must be provided",
  CANNOT_DETECT_NETWORKS = "Could not detect providers networks",
  INCONSISTENT_NETWORKS = "All providers must be connected to the same network",
}
export const DEFAULT_RETRIES = 0;
export const DEFAULT_TIMEOUT = 3_000;

export interface ProviderConfig {
  provider: BaseProvider;
  retries?: number;
  timeout?: number;
}

const isProviderConfig = (provider: BaseProvider | ProviderConfig): provider is ProviderConfig =>
  (provider as ProviderConfig).provider !== undefined;

export const validateAndGetNetwork = async (providers: (BaseProvider | ProviderConfig)[]) => {
  const providerConfigs = providers.map(p => (isProviderConfig(p) ? p : { provider: p }));
  if (providers.length === 0) throw new Error(FallbackProviderError.NO_PROVIDER);

  const networks = await Promise.all(
    providerConfigs.map(({ provider }) => provider.getNetwork().catch(() => null))
  );
  const availableNetworks: Network[] = [];
  const availableProviders: ProviderConfig[] = [];
  networks.forEach((network, i) => {
    if (!network) return;
    availableNetworks.push(network);
    availableProviders.push(providerConfigs[i]);
  });

  if (availableProviders.length === 0)
    throw new Error(FallbackProviderError.CANNOT_DETECT_NETWORKS);

  const defaultNetwork = availableNetworks[0];

  if (availableNetworks.find(n => n.chainId !== defaultNetwork.chainId))
    throw new Error(FallbackProviderError.INCONSISTENT_NETWORKS);

  return { network: defaultNetwork, providers: availableProviders };
};

export class FallbackProvider extends BaseProvider {
  private _providers: ProviderConfig[] = [];

  constructor(_providers: (BaseProvider | ProviderConfig)[]) {
    const networkAndProviders = validateAndGetNetwork(_providers);

    const network = networkAndProviders.then(({ network, providers }) => {
      this._providers = providers;
      return network;
    });

    super(network);
  }

  async detectNetwork(): Promise<Network> {
    return validateAndGetNetwork(this._providers).then(({ network }) => network);
  }

  private async performWithProvider(
    providerIndex: number,
    method: string,
    params: { [name: string]: any },
    retries = 0
  ): Promise<any> {
    const { provider, retries: maxRetries, timeout } = this._providers[providerIndex];
    try {
      return await promiseWithTimeout(provider.perform(method, params), timeout ?? DEFAULT_TIMEOUT);
    } catch (e) {
      if (retries++ < (maxRetries ?? DEFAULT_RETRIES))
        return this.performWithProvider(providerIndex, method, params, retries);
      if (providerIndex >= this._providers.length - 1) throw e;
      // eslint-disable-next-line no-console
      console.warn(
        `[FallbackProvider] Call to \`${method}\` failing with provider n°${providerIndex}, retrying with provider n°${providerIndex +
          1}\n\n${e}`
      );
      return this.performWithProvider(providerIndex + 1, method, params);
    }
  }

  async perform(method: string, params: { [name: string]: any }): Promise<any> {
    await this._ready();
    return this.performWithProvider(0, method, params);
  }
}

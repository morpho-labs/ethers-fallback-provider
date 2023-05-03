import { BaseProvider, Network } from "@ethersproject/providers";

import { promiseWithTimeout } from "../utils/promises";

export enum FallbackProviderError {
  NO_PROVIDER = "At least one provider must be provided",
  CANNOT_DETECT_NETWORKS = "Could not detect providers networks",
  INCONSISTENT_NETWORKS = "All providers must be connected to the same network",
}

export const checkNetworks = async (providers: BaseProvider[]) => {
  if (providers.length === 0) throw new Error(FallbackProviderError.NO_PROVIDER);

  const networks = await Promise.all(providers.map((p) => p.getNetwork().catch(() => null)));
  const availableNetworks: Network[] = [];
  const availableProviders: BaseProvider[] = [];
  networks.forEach((network, i) => {
    if (!network) return;
    availableNetworks.push(network);
    availableProviders.push(providers[i]);
  });

  if (availableProviders.length === 0)
    throw new Error(FallbackProviderError.CANNOT_DETECT_NETWORKS);

  const defaultNetwork = availableNetworks[0];

  if (availableNetworks.find((n) => n.chainId !== defaultNetwork.chainId))
    throw new Error(FallbackProviderError.INCONSISTENT_NETWORKS);

  return { network: defaultNetwork, providers: availableProviders };
};

export class FallbackProvider extends BaseProvider {
  private _providers: BaseProvider[] = [];

  constructor(_providers: BaseProvider[], private _requestTimeout = 3000) {
    const networkAndProviders = checkNetworks(_providers);

    const network = networkAndProviders.then(({ network, providers }) => {
      this._providers = providers;
      return network;
    });

    super(network);
  }

  async detectNetwork(): Promise<Network> {
    return checkNetworks(this._providers).then(({ network }) => network);
  }

  private async performWithProvider(
    providerIndex: number,
    method: string,
    params: { [name: string]: any }
  ): Promise<any> {
    try {
      return await promiseWithTimeout(
        this._providers[providerIndex].perform(method, params),
        this._requestTimeout
      );
    } catch (e) {
      if (providerIndex >= this._providers.length - 1) throw e;
      // eslint-disable-next-line no-console
      console.warn(
        `[FallbackProvider] Call to \`${method}\` failing with provider n°${providerIndex}, retrying with provider n°${
          providerIndex + 1
        }\n\n${e}`
      );
      return this.performWithProvider(providerIndex + 1, method, params);
    }
  }

  async perform(method: string, params: { [name: string]: any }): Promise<any> {
    await this._ready();
    return this.performWithProvider(0, method, params);
  }
}

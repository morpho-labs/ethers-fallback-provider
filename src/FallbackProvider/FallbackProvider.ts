import { BaseProvider, Network } from "@ethersproject/providers";

import { promiseWithTimeout } from "../utils/promises";

export const checkNetworks = (providers: BaseProvider[]) =>
  Promise.all(providers.map((p) => p.getNetwork().catch(() => null))).then(
    (providersNetworks) => {
      const availableNetworks: Network[] = [];
      const availableProviders: BaseProvider[] = [];
      providersNetworks.forEach((network, i) => {
        if (!network) return;
        availableNetworks.push(network);
        availableProviders.push(providers[i]);
      });

      if (availableProviders.length === 0)
        throw new Error("Could not detect providers networks");

      const defaultNetwork = availableNetworks[0];

      if (availableNetworks.find((n) => n.chainId !== defaultNetwork.chainId))
        throw new Error("All providers must be connected to the same network");

      providers.splice(0, providers.length, ...availableProviders); // We only wanna keep the providers that could return a network
      return defaultNetwork;
    }
  );

export class FallbackProvider extends BaseProvider {
  constructor(
    private _providers: BaseProvider[],
    private _requestTimeout = 3000
  ) {
    if (_providers.length === 0)
      throw new Error("At least one provider must be provided");

    const network = checkNetworks(_providers);

    super(network);
  }

  async detectNetwork(): Promise<Network> {
    return checkNetworks(this._providers);
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
      if (providerIndex === this._providers.length - 1) throw e;
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
    return this.performWithProvider(0, method, params);
  }
}

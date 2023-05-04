import { BaseProvider, Network } from "@ethersproject/providers";

export default class MockProvider extends BaseProvider {
  constructor(protected _id: string, protected _networkId = 1) {
    super(_networkId);
  }

  async perform() {
    return this._id;
  }

  async getNetwork(): Promise<Network> {
    if (this._networkId === 0) throw new Error("Network id is 0");
    return {
      name: `Network ${this._networkId}`,
      chainId: this._networkId,
    };
  }
}

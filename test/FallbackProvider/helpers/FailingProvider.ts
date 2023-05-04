import { BaseProvider, Network } from "@ethersproject/providers";

import MockProvider from "./MockProvider";

export default class FailingProvider extends MockProvider {
  async perform(): Promise<string> {
    throw Error("Failing provider used: " + this._id);
  }
}

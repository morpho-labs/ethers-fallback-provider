import { BaseProvider } from "@ethersproject/providers";

export default class FailingProvider extends BaseProvider {
  constructor(private _id: string) {
    super(1);
  }

  async perform() {
    throw Error("Failing provider used: " + this._id);
  }
}

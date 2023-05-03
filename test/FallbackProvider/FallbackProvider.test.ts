import { FallbackProvider } from "src/FallbackProvider";

import { BaseProvider } from "@ethersproject/providers";

import FailingProvider from "./helpers/FailingProvider";
import MockProvider from "./helpers/MockProvider";

describe("FallbackProvider", () => {
  describe("perform", () => {
    jest.mock("../../src/FallbackProvider", () => ({
      ...jest.requireActual("../../src/FallbackProvider"),
      checkNetworks: jest
        .fn()
        .mockImplementation(async (providers: BaseProvider[]) =>
          providers[0].getNetwork().then((network) => ({ network, providers }))
        ),
    }));

    it("should return the first value if the first provider is successful", async () => {
      const provider1 = new MockProvider("1");
      const provider2 = new MockProvider("2");
      const provider = new FallbackProvider([provider1, provider2]);

      jest.spyOn(provider1, "perform");
      jest.spyOn(provider2, "perform");

      const res = await provider.perform("send", {});

      expect(provider1.perform).toHaveBeenCalledTimes(1);
      expect(provider2.perform).not.toHaveBeenCalled();
      expect(res).toEqual("1");
    });

    it("should return the second value if the first provider is failing", async () => {
      const provider1 = new FailingProvider("1");
      const provider2 = new MockProvider("2");
      const provider = new FallbackProvider([provider1, provider2]);

      jest.spyOn(provider1, "perform");
      jest.spyOn(provider2, "perform");

      const res = await provider.perform("send", {});

      expect(provider1.perform).toHaveBeenCalledTimes(1);
      expect(provider2.perform).toHaveBeenCalledTimes(1);
      expect(res).toEqual("2");
    });

    it("should fail if all providers are failing", async () => {
      const provider1 = new FailingProvider("1");
      const provider2 = new FailingProvider("2");
      const provider = new FallbackProvider([provider1, provider2]);

      jest.spyOn(provider1, "perform");
      jest.spyOn(provider2, "perform");

      try {
        await provider.perform("send", {});
      } catch (e) {
        expect(e).toEqual(new Error("Failing provider used: 2"));
      }

      expect(provider1.perform).toHaveBeenCalledTimes(1);
      expect(provider2.perform).toHaveBeenCalledTimes(1);
    });
  });
});

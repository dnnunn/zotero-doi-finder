import hooks from "./hooks";

class Addon {
  public data: {
    alive: boolean;
    locale?: string;
  };
  public hooks: typeof hooks;
  public api: {
    findDOIs?: () => Promise<void>;
    findDOIForItem?: (item: any) => Promise<string | null>;
  };

  constructor() {
    this.data = {
      alive: true,
    };
    this.hooks = hooks;
    this.api = {};
  }
}

const addon = new Addon();
export default addon;

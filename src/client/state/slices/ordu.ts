import type { OrduView } from '../../../shared/protocol';
import type { Slice } from '../store';

declare module '../store' {
  interface Store {
    /** The floor's offices, teams and roles (its ordu.json), with the roles' latest reports. */
    ordu: OrduView | null;
  }
  interface Topics {
    ordu: true;
  }
}

export const ordu: Slice = {
  init(s) {
    s.ordu = null;
  },
  on: {
    'ordu.state'(s, m) {
      s.ordu = m.view;
      return ['ordu'];
    },
  },
  // Another floor's army isn't this one's: the panel asks for this floor's (see features/ordu).
  enter(s) {
    s.ordu = null;
    return ['ordu'];
  },
};

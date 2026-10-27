import type { SeoCheckerAction, SeoChecksState } from '../../../../../../shared';

export function reducer(state: SeoChecksState, action: SeoCheckerAction): SeoChecksState {
  switch (action.type) {
    case 'UPDATE_PONCTUAL':
      return {
        ...state,
        [action.value.entity]: {
          qualityVerdict: action.value.qualityVerdict,
          message: action.value.message,
        },
      };
    case 'UPDATE_FOR_PREVIEW':
      return action.value;
    default:
      return state;
  }
}

/* oxlint-disable typescript/consistent-type-imports */
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  type SvgIconProps = import('react').SVGProps<SVGSVGElement> & {
    size?: number;
    className?: string;
  };

  export const FishLogo: import('react').ComponentType<SvgIconProps>;
  export const IconChevronDownOutlineRegular: import('react').ComponentType<SvgIconProps>;
  export const IconProjectAddOutlineRegular: import('react').ComponentType<SvgIconProps>;
  export const IconSettingsOutlineRegular: import('react').ComponentType<SvgIconProps>;
  export const IconUserOutlineRegular: import('react').ComponentType<SvgIconProps>;
  export const IconSkillOutlineRegular: import('react').ComponentType<SvgIconProps>;
  export const IconBranchOutlineRegular: import('react').ComponentType<SvgIconProps>;
  export const IconLinkOutlineRegular: import('react').ComponentType<SvgIconProps>;
  export const IconDataOutlineRegular: import('react').ComponentType<SvgIconProps>;

  export const Menu: import('react').ComponentType<{
    open?: boolean;
    onClose?: () => void;
    items?: unknown[];
    selectedId?: unknown;
    onSelect?: (id: string) => void;
    align?: 'start' | 'end';
    [key: string]: unknown;
  }>;
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  export interface SlotsService {
    inject: (slotName: string, factory: () => unknown) => unknown;
    register: (options: Record<string, unknown>, component: unknown) => unknown;
    [key: string]: unknown;
  }

  export type ClientContext = {
    slots: SlotsService;
    [key: string]: unknown;
  };
}

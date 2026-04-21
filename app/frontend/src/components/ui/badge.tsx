import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1',
  {
    variants: {
      variant: {
        default:
          'border-primary/18 bg-primary/14 text-foreground hover:bg-primary/18',
        secondary:
          'border-border bg-secondary/82 text-secondary-foreground hover:bg-secondary/92',
        destructive:
          'border-destructive/18 bg-destructive/14 text-destructive-foreground hover:bg-destructive/18',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

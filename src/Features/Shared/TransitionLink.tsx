'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';
import { useTransitionRouter } from './Navigate';

type TransitionLinkProps = ComponentProps<typeof Link> & { href: string };

export default function TransitionLink({ href, onClick, ...rest }: TransitionLinkProps) {
  const { navigate } = useTransitionRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      rest.target === '_blank'
    ) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };

  return <Link href={href} onClick={handleClick} {...rest} />;
}

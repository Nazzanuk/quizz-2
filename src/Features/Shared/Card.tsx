'use client';

import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

type CardColor = 'sage' | 'lavender' | 'bg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  color?: CardColor;
}

export default function Card({
  color = 'sage',
  className,
  children,
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    styles[color],
    className ?? '',
  ].join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

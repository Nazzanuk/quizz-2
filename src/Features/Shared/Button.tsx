'use client';

import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { playSound, primeAudio } from './Sound';
import { haptic } from './Haptic';
import { notifyHostAudioInteraction } from '@/Features/QuizPlay/HostVoice';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.btn,
    styles[variant],
    fullWidth ? styles.full : '',
    className ?? '',
  ].join(' ');

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    primeAudio();
    notifyHostAudioInteraction();
    playSound('tap');
    haptic('tap');
    onClick?.(e);
  };

  return (
    <button className={classes} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

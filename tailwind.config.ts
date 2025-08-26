
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Cores do sistema de votação
				brand: {
					50: 'hsl(240, 100%, 98%)',
					100: 'hsl(240, 100%, 95%)',
					200: 'hsl(240, 96%, 89%)',
					300: 'hsl(240, 94%, 82%)',
					400: 'hsl(240, 89%, 74%)',
					500: 'hsl(240, 84%, 65%)',
					600: 'hsl(240, 76%, 56%)',
					700: 'hsl(240, 68%, 47%)',
					800: 'hsl(240, 69%, 38%)',
					900: 'hsl(240, 67%, 31%)',
					950: 'hsl(240, 73%, 20%)'
				},
				success: {
					50: 'hsl(142, 76%, 96%)',
					100: 'hsl(149, 80%, 90%)',
					200: 'hsl(152, 81%, 80%)',
					300: 'hsl(156, 72%, 67%)',
					400: 'hsl(158, 64%, 52%)',
					500: 'hsl(160, 84%, 39%)',
					600: 'hsl(161, 94%, 30%)',
					700: 'hsl(163, 94%, 24%)',
					800: 'hsl(163, 88%, 20%)',
					900: 'hsl(164, 86%, 16%)'
				},
				warning: {
					50: 'hsl(48, 100%, 96%)',
					100: 'hsl(48, 96%, 89%)',
					200: 'hsl(48, 97%, 77%)',
					300: 'hsl(46, 97%, 65%)',
					400: 'hsl(43, 96%, 56%)',
					500: 'hsl(38, 92%, 50%)',
					600: 'hsl(32, 95%, 44%)',
					700: 'hsl(26, 90%, 37%)',
					800: 'hsl(23, 83%, 31%)',
					900: 'hsl(22, 78%, 26%)'
				},
				danger: {
					50: 'hsl(0, 86%, 97%)',
					100: 'hsl(0, 93%, 94%)',
					200: 'hsl(0, 96%, 89%)',
					300: 'hsl(0, 94%, 82%)',
					400: 'hsl(0, 91%, 71%)',
					500: 'hsl(0, 84%, 60%)',
					600: 'hsl(0, 72%, 51%)',
					700: 'hsl(0, 74%, 42%)',
					800: 'hsl(0, 70%, 35%)',
					900: 'hsl(0, 63%, 31%)'
				},
				info: {
					50: 'hsl(204, 100%, 97%)',
					100: 'hsl(204, 94%, 94%)',
					200: 'hsl(201, 94%, 86%)',
					300: 'hsl(199, 95%, 74%)',
					400: 'hsl(198, 93%, 60%)',
					500: 'hsl(198, 89%, 48%)',
					600: 'hsl(200, 98%, 39%)',
					700: 'hsl(201, 96%, 32%)',
					800: 'hsl(201, 90%, 27%)',
					900: 'hsl(202, 80%, 24%)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					from: {
						opacity: '0',
						transform: 'translateY(4px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in': {
					from: {
						transform: 'translateX(-100%)'
					},
					to: {
						transform: 'translateX(0)'
					}
				},
				'pulse-soft': {
					'0%, 100%': {
						opacity: '1'
					},
					'50%': {
						opacity: '0.8'
					}
				},
				'shimmer': {
					'0%': {
						transform: 'translateX(-100%)'
					},
					'100%': {
						transform: 'translateX(100%)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'shimmer': 'shimmer 2s linear infinite'
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1rem' }],
				'sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'base': ['1rem', { lineHeight: '1.5rem' }],
				'lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'2xl': ['1.5rem', { lineHeight: '2rem' }],
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],
				'4xl': ['2.25rem', { lineHeight: '2.5rem' }],
				'5xl': ['3rem', { lineHeight: '1' }],
			},
			backgroundImage: {
				'gradient-brand': 'linear-gradient(135deg, hsl(213, 94%, 68%) 0%, hsl(213, 94%, 60%) 100%)',
				'gradient-success': 'linear-gradient(135deg, hsl(160, 84%, 39%) 0%, hsl(158, 64%, 52%) 100%)',
				'gradient-warning': 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(43, 96%, 56%) 100%)',
				'gradient-pink': 'linear-gradient(135deg, hsl(320, 85%, 75%) 0%, hsl(310, 80%, 68%) 100%)',
				'gradient-danger': 'linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 91%, 71%) 100%)',
				'gradient-subtle': 'linear-gradient(135deg, hsl(0, 0%, 100%) 0%, hsl(210, 14%, 97%) 100%)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

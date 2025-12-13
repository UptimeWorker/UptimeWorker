import { Language, getTranslations } from '../i18n/translations'
import { branding } from '../config/branding'
import packageJson from '../../package.json'
import { Heart } from 'lucide-react'

interface FooterProps {
  language: Language
}

export default function Footer({ language }: FooterProps) {
  const t = getTranslations(language)
  const currentYear = new Date().getFullYear()
  const version = packageJson.version

  return (
    <footer className="border-t border-border/10 bg-background/95 backdrop-blur-md mt-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="py-6">
          <div className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
              <p className="text-sm text-foreground/60">
                © {currentYear} {branding.companyName}. {t.allRightsReserved}
              </p>
              <div className="flex items-center gap-2 text-xs text-foreground/40">
                <span className="hidden sm:inline">•</span>
                <span>v{version}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-foreground/60">
              {branding.links.about && (
                <a
                  href={branding.links.about}
                  className="hover:text-foreground/90 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.about}
                </a>
              )}
              {branding.links.terms && (
                <a
                  href={branding.links.terms}
                  className="hover:text-foreground/90 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.terms}
                </a>
              )}
              {branding.links.privacy && (
                <a
                  href={branding.links.privacy}
                  className="hover:text-foreground/90 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.privacy}
                </a>
              )}
            </div>

            {/* GitHub & Donation */}
            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              {branding.githubUrl && (
                <a
                  href={branding.githubUrl}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              )}
              {branding.donationUrl && (
                <a
                  href={branding.donationUrl}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-950/50 rounded-md transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Heart className="w-4 h-4" />
                  {language === 'en' ? 'Sponsor' : 'Soutenir'}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

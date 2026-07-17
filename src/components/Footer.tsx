import { Link } from 'react-router-dom'
import { Language, getTranslations } from '../i18n/translations'
import { branding } from '../config/branding'
import packageJson from '../../package.json'
import { Heart, Coffee, Github } from 'lucide-react'

interface FooterProps {
  language: Language
}

const footerActionClass = 'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs text-foreground/70 transition-colors hover:bg-muted hover:text-foreground'

export default function Footer({ language }: FooterProps) {
  const t = getTranslations(language)
  const currentYear = new Date().getFullYear()
  const version = packageJson.version

  return (
    <footer className="mt-16 border-t border-border/60 bg-background/95 backdrop-blur-md">
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
                <Link
                  to={branding.links.about}
                  className="hover:text-foreground/90 hover:underline"
                >
                  {t.about}
                </Link>
              )}
              {branding.links.terms && (
                <Link
                  to={branding.links.terms}
                  className="hover:text-foreground/90 hover:underline"
                >
                  {t.terms}
                </Link>
              )}
              {branding.links.privacy && (
                <Link
                  to={branding.links.privacy}
                  className="hover:text-foreground/90 hover:underline"
                >
                  {t.privacy}
                </Link>
              )}
            </div>

            {/* GitHub & Donation */}
            <div className="flex flex-wrap justify-center items-center gap-2 pt-2">
              {branding.githubUrl && (
                <a
                  href={branding.githubUrl}
                  className={footerActionClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
              )}
              {branding.buymeacoffeeUrl && (
                <a
                  href={branding.buymeacoffeeUrl}
                  className={footerActionClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Buy me a coffee
                </a>
              )}
              {branding.donationUrl && (
                <a
                  href={branding.donationUrl}
                  className={footerActionClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Sponsor' : 'Soutenir'}
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs text-foreground/45">
              <span>{language === 'en' ? 'Made with' : 'Créé avec'}</span>
              <Heart className="h-3.5 w-3.5 text-pink-500" fill="currentColor" />
              <span>{language === 'en' ? 'in France by' : 'en France par'}</span>
              <a
                href="https://github.com/slymb"
                className="text-foreground/60 hover:text-foreground/90 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/slymb
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

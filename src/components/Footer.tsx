import { Language, getTranslations } from '../i18n/translations'
import { branding } from '../config/branding'
import packageJson from '../../package.json'

interface FooterProps {
  language: Language
}

export default function Footer({ language }: FooterProps) {
  const t = getTranslations(language)
  const currentYear = new Date().getFullYear()
  const version = packageJson.version

  return (
    <footer className="border-t border-border/10 bg-background/95 backdrop-blur-md mt-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="py-6">
          <div className="text-center space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
              <p className="text-sm text-foreground/60">
                © {currentYear} {branding.companyName}. {t.allRightsReserved}
              </p>
              <div className="flex items-center gap-2 text-xs text-foreground/40">
                <span className="hidden sm:inline">•</span>
                <span>v{version}</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
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
              {branding.githubUrl && (
                <a
                  href={branding.githubUrl}
                  className="hover:text-foreground/90 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

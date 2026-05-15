'use client'

import { WaTemplate, WaTemplateComponent } from '@/lib/types'

interface WhatsAppPreviewProps {
  template: WaTemplate | null
  variables?: Record<string, string>
}

function resolveText(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, idx) => {
    const key = Object.keys(variables)[parseInt(idx) - 1]
    return key && variables[key] ? variables[key] : `{{${idx}}}`
  })
}

function getBodyText(components: WaTemplateComponent[]): string {
  return components.find((c) => c.type === 'BODY')?.text || ''
}

function getHeaderComponent(components: WaTemplateComponent[]): WaTemplateComponent | undefined {
  return components.find((c) => c.type === 'HEADER')
}

function getFooterText(components: WaTemplateComponent[]): string {
  return components.find((c) => c.type === 'FOOTER')?.text || ''
}

function getButtons(components: WaTemplateComponent[]) {
  return components.find((c) => c.type === 'BUTTONS')?.buttons || []
}

export function WhatsAppPreview({ template, variables = {} }: WhatsAppPreviewProps) {
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-muted-foreground">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <p className="text-center text-balance">Selecione um template para visualizar o preview</p>
      </div>
    )
  }

  const header = getHeaderComponent(template.components)
  const bodyText = getBodyText(template.components)
  const footerText = getFooterText(template.components)
  const buttons = getButtons(template.components)
  const resolvedBody = resolveText(bodyText, variables)

  const now = new Date()
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      {/* WhatsApp chrome */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-lg max-w-[320px] mx-auto w-full">
        {/* Status bar */}
        <div className="bg-[#075E54] px-4 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium leading-none">Empresa</p>
            <p className="text-white/70 text-xs">online</p>
          </div>
        </div>

        {/* Chat body */}
        <div
          className="px-3 py-4 min-h-[260px] flex flex-col justify-end gap-1"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23e5ddd5'/%3E%3C/svg%3E")`,
            backgroundColor: '#e5ddd5',
          }}
        >
          {/* Message bubble */}
          <div className="max-w-[85%] self-end">
            <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm overflow-hidden shadow-sm">
              {/* Header */}
              {header && (
                <div className="bg-[#c8f0a6] px-3 pt-3 pb-1">
                  {header.format === 'IMAGE' && (
                    <div className="w-full h-28 bg-gray-300 rounded-lg flex items-center justify-center mb-1">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </div>
                  )}
                  {header.format === 'VIDEO' && (
                    <div className="w-full h-28 bg-gray-300 rounded-lg flex items-center justify-center mb-1">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                    </div>
                  )}
                  {header.format === 'TEXT' && header.text && (
                    <p className="text-[13px] font-semibold text-gray-900 mb-1">
                      {resolveText(header.text, variables)}
                    </p>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="px-3 py-2">
                <p className="text-[13px] text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {resolvedBody || 'Corpo da mensagem...'}
                </p>
              </div>

              {/* Footer */}
              {footerText && (
                <div className="px-3 pb-2">
                  <p className="text-[11px] text-gray-500">{footerText}</p>
                </div>
              )}

              {/* Time */}
              <div className="flex justify-end items-center gap-1 px-3 pb-2">
                <span className="text-[10px] text-gray-500">{timeStr}</span>
                <svg className="w-3.5 h-3.5 text-[#34B7F1]" fill="currentColor" viewBox="0 0 16 11">
                  <path d="M11.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.085.001l-3-3.25a.75.75 0 0 1 1.085-1.028l2.46 2.664L10.01.678a.75.75 0 0 1 1.06-.025ZM2.56 5.96 1.5 7.09a.75.75 0 0 0 1.085 1.028l-.025-.027Z" />
                  <path d="M14.571.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.043.027L8.5 7.75l.535-.578 5.476-5.894a.75.75 0 0 1 1.06-.625Z" />
                </svg>
              </div>
            </div>

            {/* Buttons */}
            {buttons.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {buttons.map((btn, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl text-center py-2 px-3 text-[13px] text-[#00a884] font-medium shadow-sm"
                  >
                    {btn.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

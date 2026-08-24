import { TripCover } from '@/components/trip/trip-cover';
import type { PdfData } from '@/lib/pdf/document-data';
import type { PdfOptions } from '@/lib/pdf/options';
import {
  dateInZone, formatDate, formatDateRange, formatDateTime, formatDuration, formatFullWeekday,
  formatSpan, nightsBetween, timeInZone, timezoneAbbreviation, tripDayCount,
} from '@/lib/format/date';
import { formatMoney, formatPercent } from '@/lib/format/money';
import { formatDistance } from '@/lib/format/distance';
import { ACCOMMODATION_KIND_LABEL } from '@/lib/validators/accommodation';
import { EXPENSE_CATEGORY_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/validators/expense';
import { DOCUMENT_CATEGORY_LABEL } from '@/lib/validators/misc';
import { CONTACT_KIND_LABEL } from '@/lib/validators/misc';
import { APP } from '@/lib/config';

/**
 * Documento imprimível da viagem.
 *
 * Regra que guia todo este arquivo: o PDF precisa ser útil SEM internet.
 * Por isso nada depende de link — endereço, horário, telefone e código de
 * reserva aparecem sempre em texto. Os QR Codes são um atalho a mais, nunca
 * a única forma de chegar à informação.
 */
export function TripDocument({ data, options }: { data: PdfData; options: PdfOptions }) {
  const { bundle } = data;
  const trip = bundle.trip;
  const complete = options.mode === 'completo';
  const days = tripDayCount(trip.start_date, trip.end_date);
  const nights = nightsBetween(trip.start_date, trip.end_date);

  return (
    <article className="pdf-root mx-auto max-w-[820px] bg-white text-[#111] print:max-w-none">
      {/* ---------------------------------------------------------- Capa */}
      <header className="print-avoid-break">
        <TripCover
          name={trip.name}
          imageUrl={trip.cover_image_url}
          className="h-44 w-full overflow-hidden rounded-[12px] print:h-36 print:rounded-none"
        />
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#666]">
            Roteiro {options.mode === 'resumido' ? 'resumido' : 'completo'}
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">{trip.name}</h1>
          <p className="mt-2 text-[15px] text-[#444]">
            {formatDateRange(trip.start_date, trip.end_date)} · {days} {days === 1 ? 'dia' : 'dias'} ·{' '}
            {nights} {nights === 1 ? 'noite' : 'noites'}
          </p>
          <p className="mt-1 text-[14px] text-[#444]">
            {trip.travelers_count} {trip.travelers_count === 1 ? 'viajante' : 'viajantes'}
            {trip.destination_label ? ` · ${trip.destination_label}` : ''}
          </p>
        </div>
      </header>

      {/* -------------------------------------------------------- Resumo */}
      <Section title="Resumo">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
          <Row label="Destino" value={trip.destination_label ?? bundle.destinations.map((d) => d.city).join(', ')} />
          <Row label="Período" value={`${formatDate(trip.start_date)} a ${formatDate(trip.end_date)}`} />
          <Row label="Duração" value={`${days} dias / ${nights} noites`} />
          <Row label="Viajantes" value={String(trip.travelers_count)} />
          <Row
            label="Participantes"
            value={bundle.members
              .filter((m) => m.invite_status === 'accepted')
              .map((m) => m.profile?.full_name ?? m.display_name ?? m.invited_email)
              .filter(Boolean)
              .join(', ')}
          />
          <Row label="Fuso principal" value={`${trip.timezone} (${timezoneAbbreviation(trip.timezone)})`} />
          {options.finance && trip.estimated_budget != null && (
            <Row label="Orçamento" value={formatMoney(trip.estimated_budget, trip.base_currency)} />
          )}
        </dl>

        {options.notes && trip.description && (
          <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-[#333]">{trip.description}</p>
        )}
      </Section>

      {/* --------------------------------------------------------- Voos */}
      {bundle.flights.length > 0 && (
        <Section title="Voos">
          <div className="space-y-4">
            {bundle.flights.map((flight) => {
              const qr = data.qrCodes[`voo-${flight.id}`];
              return (
                <div key={flight.id} className="print-avoid-break rounded-[10px] border border-[#ddd] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">
                        {flight.origin_iata ?? flight.origin_airport} → {flight.destination_iata ?? flight.destination_airport}
                        {flight.group_label && (
                          <span className="ml-2 text-[12px] font-normal text-[#666]">({flight.group_label})</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#555]">
                        {[flight.airline, flight.flight_number].filter(Boolean).join(' ')}
                        {flight.arrival_at && ` · duração ${formatSpan(flight.departure_at, flight.arrival_at)}`}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[12.5px]">
                        <div>
                          <p className="font-semibold">
                            {formatDate(dateInZone(flight.departure_at, flight.origin_timezone))} ·{' '}
                            {timeInZone(flight.departure_at, flight.origin_timezone)}
                            <span className="ml-1 text-[11px] font-normal text-[#666]">
                              {timezoneAbbreviation(flight.origin_timezone)}
                            </span>
                          </p>
                          <p className="text-[#555]">{flight.origin_airport}</p>
                          {flight.origin_terminal && <p className="text-[#666]">Terminal {flight.origin_terminal}</p>}
                          {flight.boarding_at && (
                            <p className="text-[#666]">
                              Embarque {timeInZone(flight.boarding_at, flight.origin_timezone)}
                              {flight.gate && ` · portão ${flight.gate}`}
                            </p>
                          )}
                        </div>
                        <div>
                          {flight.arrival_at && (
                            <>
                              <p className="font-semibold">
                                {formatDate(dateInZone(flight.arrival_at, flight.destination_timezone))} ·{' '}
                                {timeInZone(flight.arrival_at, flight.destination_timezone)}
                                <span className="ml-1 text-[11px] font-normal text-[#666]">
                                  {timezoneAbbreviation(flight.destination_timezone)}
                                </span>
                              </p>
                              <p className="text-[#555]">{flight.destination_airport}</p>
                              {flight.destination_terminal && (
                                <p className="text-[#666]">Terminal {flight.destination_terminal}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
                        {flight.booking_reference && (
                          <InlineRow label="Localizador" value={flight.booking_reference} mono />
                        )}
                        {flight.seats && <InlineRow label="Assentos" value={flight.seats} />}
                        {flight.checked_baggage && <InlineRow label="Bagagem" value={flight.checked_baggage} />}
                        {flight.carry_on_baggage && <InlineRow label="Mão" value={flight.carry_on_baggage} />}
                        {flight.cabin_class && <InlineRow label="Classe" value={flight.cabin_class} />}
                        {options.finance && flight.total_price != null && (
                          <InlineRow label="Total" value={formatMoney(flight.total_price, flight.currency)} />
                        )}
                      </dl>

                      {flight.passengers && flight.passengers.length > 0 && (
                        <p className="mt-2 text-[12px] text-[#555]">
                          Passageiros:{' '}
                          {flight.passengers
                            .map((p) => `${p.full_name}${p.seat ? ` (${p.seat})` : ''}`)
                            .join(', ')}
                        </p>
                      )}

                      {options.notes && flight.notes && (
                        <p className="mt-2 text-[12px] text-[#555]">{flight.notes}</p>
                      )}
                    </div>

                    {qr && <QrBlock src={qr} caption="Reserva" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ---------------------------------------------------- Hospedagem */}
      {bundle.accommodations.length > 0 && (
        <Section title="Hospedagem">
          <div className="space-y-4">
            {bundle.accommodations.map((stay) => {
              const qr = data.qrCodes[`hospedagem-${stay.id}`];
              return (
                <div key={stay.id} className="print-avoid-break rounded-[10px] border border-[#ddd] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">{stay.name}</p>
                      <p className="mt-0.5 text-[12px] text-[#555]">
                        {ACCOMMODATION_KIND_LABEL[stay.kind]}
                        {stay.platform && ` · ${stay.platform}`}
                      </p>
                      {stay.address && <p className="mt-2 text-[12.5px] text-[#333]">{stay.address}</p>}

                      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[12.5px]">
                        <Row
                          label="Check-in"
                          value={`${formatDate(dateInZone(stay.check_in_at, stay.timezone))} às ${timeInZone(stay.check_in_at, stay.timezone)}`}
                        />
                        <Row
                          label="Check-out"
                          value={`${formatDate(dateInZone(stay.check_out_at, stay.timezone))} às ${timeInZone(stay.check_out_at, stay.timezone)}`}
                        />
                        {stay.booking_reference && <Row label="Reserva" value={stay.booking_reference} />}
                        {stay.phone && <Row label="Telefone" value={stay.phone} />}
                        {stay.room_type && <Row label="Quarto" value={stay.room_type} />}
                        {stay.guests && <Row label="Hóspedes" value={String(stay.guests)} />}
                        {stay.host_name && <Row label="Anfitrião" value={stay.host_name} />}
                        {stay.wifi_password && <Row label="Wi-Fi" value={stay.wifi_password} />}
                        {options.finance && stay.total_price != null && (
                          <Row label="Total" value={formatMoney(stay.total_price, stay.currency)} />
                        )}
                      </dl>

                      {stay.access_instructions && (
                        <p className="mt-2 text-[12px] text-[#555]">
                          <span className="font-medium">Entrada:</span> {stay.access_instructions}
                        </p>
                      )}
                      {stay.breakfast_included && (
                        <p className="mt-1 text-[12px] text-[#555]">Café da manhã incluso.</p>
                      )}
                      {options.notes && stay.notes && (
                        <p className="mt-2 text-[12px] text-[#555]">{stay.notes}</p>
                      )}
                    </div>

                    {qr && <QrBlock src={qr} caption="Local / reserva" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* --------------------------------------------------------- Carro */}
      {bundle.carRentals.length > 0 && (
        <Section title="Aluguel de carro">
          <div className="space-y-4">
            {bundle.carRentals.map((car) => (
              <div key={car.id} className="print-avoid-break rounded-[10px] border border-[#ddd] p-4">
                <p className="text-[15px] font-semibold">{car.company}</p>
                <p className="mt-0.5 text-[12px] text-[#555]">
                  {[car.category, car.vehicle_model].filter(Boolean).join(' · ')}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[12.5px]">
                  <Row
                    label="Retirada"
                    value={`${formatDate(dateInZone(car.pickup_at, car.pickup_timezone))} às ${timeInZone(car.pickup_at, car.pickup_timezone)}`}
                  />
                  <Row
                    label="Devolução"
                    value={`${formatDate(dateInZone(car.dropoff_at, car.dropoff_timezone))} às ${timeInZone(car.dropoff_at, car.dropoff_timezone)}`}
                  />
                  <Row label="Local de retirada" value={car.pickup_address ?? car.pickup_location} />
                  <Row label="Local de devolução" value={car.dropoff_address ?? car.dropoff_location} />
                  {car.booking_reference && <Row label="Reserva" value={car.booking_reference} />}
                  {car.company_phone && <Row label="Telefone" value={car.company_phone} />}
                  {car.insurance && <Row label="Proteção" value={car.insurance} />}
                  {car.fuel_policy && <Row label="Combustível" value={car.fuel_policy} />}
                  {car.main_driver && <Row label="Motorista" value={car.main_driver} />}
                  {options.finance && car.total_price != null && (
                    <Row label="Total" value={formatMoney(car.total_price, car.currency)} />
                  )}
                </dl>
                {options.notes && car.notes && <p className="mt-2 text-[12px] text-[#555]">{car.notes}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ------------------------------------------------ Roteiro dia a dia */}
      <Section title="Roteiro dia a dia" pageBreak>
        <div className="space-y-6">
          {data.days.map((day) => (
            <div key={day.date} className="print-avoid-break">
              <h3 className="border-b border-[#ddd] pb-1.5 text-[14px] font-semibold capitalize">
                Dia {day.index} — {formatFullWeekday(day.date)}
              </h3>

              {day.events.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[#666]">Dia livre.</p>
              ) : (
                <ol className="mt-2">
                  {day.events.map((event, index) => {
                    const leg = day.legs[index];
                    return (
                      <li key={event.id}>
                        <div className="flex gap-3 py-1.5">
                          <span className="w-12 shrink-0 text-[12.5px] font-semibold tabular-nums">
                            {event.allDay ? '—' : timeInZone(event.startsAt ?? '', event.timezone)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium">{event.title}</p>
                            {event.address && <p className="text-[12px] text-[#555]">{event.address}</p>}
                            <p className="text-[11.5px] text-[#666]">
                              {[
                                event.reservationCode ? `Reserva ${event.reservationCode}` : null,
                                event.phone,
                                options.finance && event.cost != null
                                  ? formatMoney(event.cost, event.currency)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            {options.notes && event.notes && (
                              <p className="mt-0.5 text-[11.5px] text-[#666]">{event.notes}</p>
                            )}
                          </div>
                        </div>
                        {leg && (
                          <p className="ml-[3.75rem] border-l border-dashed border-[#ccc] py-0.5 pl-3 text-[11px] text-[#777]">
                            ↓ {formatDistance(leg.distanceMeters)} · {formatDuration(leg.durationSeconds)} de carro
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {options.maps && day.mapUrl && (
                <div className="mt-3 print-avoid-break">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#666]">
                    Mapa do dia
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={day.mapUrl}
                    alt={`Mapa do dia ${day.index}`}
                    className="w-full rounded-[8px] border border-[#ddd]"
                  />
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <ol className="flex-1 text-[11.5px] text-[#444]">
                      {day.stops.map((stop, i) => (
                        <li key={i}>
                          <span className="font-semibold">{stop.label}.</span> {stop.title}
                          {stop.address && <span className="text-[#777]"> — {stop.address}</span>}
                        </li>
                      ))}
                    </ol>
                    {options.qrCodes && data.qrCodes[`dia-${day.date}`] && (
                      <QrBlock src={data.qrCodes[`dia-${day.date}`]} caption="Rota do dia" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {data.unscheduled.length > 0 && (
          <div className="mt-6 print-avoid-break">
            <h3 className="border-b border-[#ddd] pb-1.5 text-[14px] font-semibold">Sem data definida</h3>
            <ul className="mt-2 text-[12.5px]">
              {data.unscheduled.map((event) => (
                <li key={event.id} className="py-0.5">
                  {event.title}
                  {event.address && <span className="text-[#666]"> — {event.address}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ------------------------------------------------------- Contatos */}
      {options.contacts && bundle.contacts.length > 0 && (
        <Section title="Contatos importantes">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12.5px]">
            {bundle.contacts.map((contact) => (
              <div key={contact.id}>
                <dt className="font-semibold">
                  {contact.label}
                  <span className="ml-1.5 text-[11px] font-normal text-[#777]">
                    {CONTACT_KIND_LABEL[contact.kind]}
                  </span>
                </dt>
                <dd className="text-[#444]">
                  {[contact.phone, contact.email, contact.address, contact.reference_code]
                    .filter(Boolean)
                    .join(' · ')}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* ------------------------------------------------------ Financeiro */}
      {options.finance && bundle.expenses.length > 0 && (
        <Section title="Financeiro" pageBreak={complete}>
          <dl className="grid grid-cols-4 gap-4 text-[12.5px]">
            <Stat label="Orçamento" value={formatMoney(data.finance.budget, trip.base_currency)} />
            <Stat label="Previsto" value={formatMoney(data.finance.actual, trip.base_currency)} />
            <Stat label="Pago" value={formatMoney(data.finance.paid, trip.base_currency)} />
            <Stat label="A pagar" value={formatMoney(data.finance.outstanding, trip.base_currency)} />
          </dl>

          {data.byCategory.length > 0 && (
            <table className="mt-5 w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[#ccc] text-left">
                  <th className="py-1.5 font-semibold">Categoria</th>
                  <th className="py-1.5 text-right font-semibold">Valor</th>
                  <th className="py-1.5 text-right font-semibold">Participação</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.map((entry) => (
                  <tr key={entry.category} className="border-b border-[#eee]">
                    <td className="py-1">{EXPENSE_CATEGORY_LABEL[entry.category]}</td>
                    <td className="py-1 text-right tabular-nums">
                      {formatMoney(entry.total, trip.base_currency)}
                    </td>
                    <td className="py-1 text-right tabular-nums">{formatPercent(entry.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {complete && (
            <table className="mt-5 w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="border-b border-[#ccc] text-left">
                  <th className="py-1.5 font-semibold">Despesa</th>
                  <th className="py-1.5 font-semibold">Situação</th>
                  <th className="py-1.5 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {bundle.expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-[#eee]">
                    <td className="py-1">
                      {expense.description}
                      <span className="text-[#777]"> · {EXPENSE_CATEGORY_LABEL[expense.category]}</span>
                    </td>
                    <td className="py-1">{PAYMENT_STATUS_LABEL[expense.payment_status]}</td>
                    <td className="py-1 text-right tabular-nums">
                      {formatMoney(expense.actual_amount ?? expense.planned_amount, expense.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {/* ------------------------------------------------------ Checklist */}
      {options.checklist && bundle.checklists.length > 0 && (
        <Section title="Checklist">
          <div className="grid grid-cols-2 gap-6">
            {bundle.checklists.map((list) => (
              <div key={list.id} className="print-avoid-break">
                <h3 className="text-[13px] font-semibold">{list.title}</h3>
                <ul className="mt-1.5 text-[12px]">
                  {list.items.map((item) => (
                    <li key={item.id} className="py-0.5">
                      <span className="mr-1.5 inline-block">{item.is_done ? '☑' : '☐'}</span>
                      <span className={item.is_done ? 'text-[#888] line-through' : ''}>{item.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------ Documentos */}
      {options.documents && bundle.documents.length > 0 && (
        <Section title="Documentos anexados">
          <p className="mb-2 text-[11.5px] text-[#666]">
            Os arquivos ficam no aplicativo, em armazenamento privado. Esta é apenas a relação do que está
            guardado.
          </p>
          <ul className="text-[12.5px]">
            {bundle.documents.map((document) => (
              <li key={document.id} className="border-b border-[#eee] py-1">
                {document.name}
                <span className="text-[#777]"> · {DOCUMENT_CATEGORY_LABEL[document.category]}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ---------------------------------------------------- Observações */}
      {options.notes && trip.notes && (
        <Section title="Observações">
          <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#333]">{trip.notes}</p>
        </Section>
      )}

      <footer className="mt-10 border-t border-[#ddd] pt-3 text-[10.5px] text-[#777]">
        <p>
          {trip.name} · {APP.name} · gerado em {formatDateTime(data.generatedAt, trip.timezone)}
        </p>
        <p className="mt-0.5">
          Horários no fuso de cada local. Confira sempre os dados diretamente com a companhia aérea, o hotel e
          a locadora antes de viajar.
        </p>
      </footer>
    </article>
  );
}

function Section({
  title,
  children,
  pageBreak = false,
}: {
  title: string;
  children: React.ReactNode;
  pageBreak?: boolean;
}) {
  return (
    <section className={`mt-8 ${pageBreak ? 'print-page-break' : ''}`}>
      <h2 className="mb-3 border-b-2 border-[#111] pb-1 text-[16px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[#777]">{label}</dt>
      <dd className="text-[#222]">{value}</dd>
    </div>
  );
}

function InlineRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-[#777]">{label}:</dt>
      <dd className={mono ? 'font-mono font-semibold' : 'font-medium'}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[#777]">{label}</dt>
      <dd className="text-[15px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function QrBlock({ src, caption }: { src: string; caption: string }) {
  return (
    <div className="shrink-0 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={72} height={72} className="h-[72px] w-[72px]" />
      <p className="mt-1 text-[9.5px] leading-tight text-[#777]">{caption}</p>
    </div>
  );
}

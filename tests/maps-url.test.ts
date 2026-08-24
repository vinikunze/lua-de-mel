import { describe, expect, it } from 'vitest';
import {
  buildDirectionsUrl, buildNavigateFromHereUrl, buildPlaceUrl, buildRouteUrlFromStops,
  hasCoordinates, pointQuery,
} from '@/lib/google/maps-url';

const hotel = { name: 'Hotel', latitude: -29.3788, longitude: -50.8761, googlePlaceId: 'PLACE_HOTEL' };
const lago = { name: 'Lago Negro', latitude: -29.3921, longitude: -50.8794, googlePlaceId: 'PLACE_LAGO' };
const restaurante = { name: 'Restaurante', address: 'Av. Borges de Medeiros, 100, Gramado' };

describe('identificação do ponto na URL', () => {
  it('prefere as coordenadas quando existem', () => {
    expect(pointQuery(hotel)).toBe('-29.3788,-50.8761');
  });

  it('cai para o endereço quando não há coordenadas', () => {
    expect(pointQuery(restaurante)).toBe('Av. Borges de Medeiros, 100, Gramado');
  });

  it('devolve null quando não há nada utilizável', () => {
    expect(pointQuery({})).toBeNull();
  });
});

describe('link de um local', () => {
  it('inclui o Place ID para cair no lugar exato', () => {
    const url = buildPlaceUrl(hotel);
    expect(url).toContain('https://www.google.com/maps/search/');
    expect(url).toContain('api=1');
    expect(url).toContain('query_place_id=PLACE_HOTEL');
  });

  it('devolve null sem dados suficientes', () => {
    expect(buildPlaceUrl({})).toBeNull();
  });
});

describe('link de rota', () => {
  it('monta origem, destino e modo de transporte', () => {
    const url = buildDirectionsUrl(hotel, lago, [], 'DRIVE');
    expect(url).toContain('https://www.google.com/maps/dir/');
    expect(url).toContain('travelmode=driving');
    expect(url).toContain('origin_place_id=PLACE_HOTEL');
    expect(url).toContain('destination_place_id=PLACE_LAGO');
  });

  it('traduz cada modo de transporte', () => {
    expect(buildDirectionsUrl(hotel, lago, [], 'WALK')).toContain('travelmode=walking');
    expect(buildDirectionsUrl(hotel, lago, [], 'TRANSIT')).toContain('travelmode=transit');
    expect(buildDirectionsUrl(hotel, lago, [], 'BICYCLE')).toContain('travelmode=bicycling');
  });

  it('inclui as paradas intermediárias na ordem informada', () => {
    const url = buildRouteUrlFromStops([hotel, lago, restaurante, hotel], 'DRIVE');
    expect(url).toBeTruthy();
    const params = new URL(url as string).searchParams;
    expect(params.get('origin')).toBe('-29.3788,-50.8761');
    expect(params.get('destination')).toBe('-29.3788,-50.8761');
    expect(params.get('waypoints')).toBe(
      '-29.3921,-50.8794|Av. Borges de Medeiros, 100, Gramado',
    );
  });

  it('não gera rota com menos de dois pontos', () => {
    expect(buildRouteUrlFromStops([hotel])).toBeNull();
    expect(buildRouteUrlFromStops([])).toBeNull();
  });

  it('monta o link de navegação a partir da localização atual', () => {
    const url = buildNavigateFromHereUrl(lago, 'DRIVE');
    expect(url).toContain('destination=-29.3921%2C-50.8794');
    expect(url).not.toContain('origin=');
  });
});

describe('verificação de coordenadas', () => {
  it('reconhece pontos mapeáveis', () => {
    expect(hasCoordinates(hotel)).toBe(true);
    expect(hasCoordinates(restaurante)).toBe(false);
    expect(hasCoordinates(null)).toBe(false);
  });
});

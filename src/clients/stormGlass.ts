import { InternalError } from "@src/util/errors/internal-error";
import { AxiosError, AxiosStatic } from "axios";

export interface StormGlassPointSource {
    [key: string]: number;
}

export interface StormGlassPoint {
    time: string;
    readonly waveHeight: StormGlassPointSource;
    readonly waveDirection: StormGlassPointSource;
    readonly swellDirection: StormGlassPointSource;
    readonly swellHeight: StormGlassPointSource;
    readonly swellPeriod: StormGlassPointSource;
    readonly windDirection: StormGlassPointSource;
    readonly windSpeed: StormGlassPointSource;
}

export interface StormGlassForecastResponse {
    hours: StormGlassPoint[];
}

export interface ForecastPoint {
    time: string;
    waveHeight: number;
    waveDirection: number;
    swellDirection: number;
    swellHeight: number;
    swellPeriod: number;
    windDirection: number;
    windSpeed: number;
}

export class ClientRequestError extends InternalError {
    constructor(message: string) {
        const internalMessage = `Unexpected error when trying to communicate to StormGlass`;

        super(`${internalMessage}: ${message}`);
    }
}

export class StormGlassResponseError extends InternalError {
    constructor(message: string) {
        const internalMessage =
            'Unexpected error returned by the StormGlass service';
        super(`${internalMessage}: ${message}`);
    }
}

export class StormGlass {
    readonly stormGlassAPIParams =
        'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';
    readonly stormGlassAPISource = 'noaa';

    constructor(protected request: AxiosStatic) {}

    public async fetchPoints(lat: number, lng: number): Promise<ForecastPoint[]> {
        try {
            const response = await this.request.get<StormGlassForecastResponse>(
                `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${this.stormGlassAPIParams}&source=${this.stormGlassAPISource}`,
                {
                    headers: {
                        Authorization: process.env.STORMGLASSTOKEN ?? '',
                    },
                }
            );
            return this.normalizeResponse(response.data);
        } catch (err) {
            /**
             * This is handling the Axios errors specifically
             */
            const axiosError = err as AxiosError;
            if (
                axiosError instanceof Error &&
                axiosError.response &&
                axiosError.response.status
            ) {
                throw new StormGlassResponseError(
                    `Error: ${JSON.stringify(axiosError.response.data)} Code: ${axiosError.response.status}`
                );
            }
            // The type is temporary given we will rework it in the upcoming chapters
            throw new ClientRequestError((err as { message: any }).message);
        }
    }


    private normalizeResponse(points: StormGlassForecastResponse): ForecastPoint[] {
        // Validation before map items
        return points.hours.filter(this.isValidPoint.bind(this)).map(point => ({
            swellDirection: point.swellDirection[this.stormGlassAPISource],
            swellHeight: point.swellHeight[this.stormGlassAPISource],
            swellPeriod: point.swellPeriod[this.stormGlassAPISource],
            time: point.time,
            waveDirection: point.waveDirection[this.stormGlassAPISource],
            waveHeight: point.waveHeight[this.stormGlassAPISource],
            windDirection: point.windDirection[this.stormGlassAPISource],
            windSpeed: point.windSpeed[this.stormGlassAPISource],
        }))
    }

    // Partial makes all properties of the type to be optional
    private isValidPoint(point: Partial<StormGlassPoint>): boolean {
        // !! forces the return to be 
        // ?. - optional changing - if exists

        return !!(
            point.time &&
            point.swellDirection?.[this.stormGlassAPISource] &&
            point.swellHeight?.[this.stormGlassAPISource] &&
            point.swellPeriod?.[this.stormGlassAPISource] &&
            point.waveDirection?.[this.stormGlassAPISource] &&
            point.waveHeight?.[this.stormGlassAPISource] &&
            point.windDirection?.[this.stormGlassAPISource] &&
            point.windSpeed?.[this.stormGlassAPISource]
        )
    }
}

// https://api.stormglass.io/v2/weather/point?lat=-33.792726&lng=151.289824&params='swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed'&source=noaa
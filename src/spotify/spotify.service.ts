import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const SpotifyWebApi = require('spotify-web-api-node');
import {
  SpotifyTrackDto,
  SpotifySearchResponseDto,
} from './dto/spotify-search.dto';

@Injectable()
export class SpotifyService {
  private spotifyApi: any;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'SPOTIFY_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      console.warn('⚠️  Spotify credentials not found in environment variables. Spotify integration will be disabled.');
      this.isConfigured = false;
      return;
    }

    this.spotifyApi = new SpotifyWebApi({
      clientId,
      clientSecret,
    });
    this.isConfigured = true;
  }

  /**
   * Check if Spotify is configured
   */
  private checkConfiguration() {
    if (!this.isConfigured) {
      throw new HttpException(
        'Spotify integration is not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Search for tracks on Spotify
   */
  async searchTracks(query: string): Promise<SpotifySearchResponseDto> {
    this.checkConfiguration();
    
    if (!query || query.trim().length === 0) {
      throw new HttpException(
        'Query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Autenticarse usando Client Credentials Flow
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body.access_token);

      // Buscar canciones
      const result = await this.spotifyApi.searchTracks(query.trim(), {
        limit: 20,
      });

      const tracks: SpotifyTrackDto[] = result.body.tracks.items.map(
        (track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map((artist: any) => artist.name),
          preview_url: track.preview_url,
          image:
            track.album.images.length > 0 ? track.album.images[0].url : null,
          external_url: track.external_urls.spotify,
        }),
      );

      return { tracks };
    } catch (error) {
      console.error('Error searching tracks on Spotify:', error);
      throw new HttpException(
        'Failed to search tracks on Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

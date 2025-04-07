import os
import sys
import datetime
import argparse
import requests
import eyed3
from mutagen.flac import FLAC, Picture
from urllib.parse import unquote
import urllib.parse

# 默认下载目录
DEFAULT_DOWNLOAD_DIR = "downloads"

# Initialize command-line argument parsing
def parse_args():
    parser = argparse.ArgumentParser(description="Download and process music files")
    parser.add_argument('-s', help='Music source: netease or tencent')
    parser.add_argument('-f', help='Song file name')
    parser.add_argument('-u', help='Song download URL')
    parser.add_argument('-c', help='Song cover URL')
    parser.add_argument('-l', help='Lyrics URL')
    parser.add_argument('-i', help='Song ID')
    parser.add_argument('-t', help='Song title')
    parser.add_argument('-ar', help='Artist')
    parser.add_argument('-al', help='Album name')
    parser.add_argument('-p', help='Publish time in the format YYYY-MM-DD HH:MM:SS')
    parser.add_argument('-sl', action='store_true', help='Save lyrics to a separate file')
    parser.add_argument('-d', '--download-dir', help='Download directory path', default=DEFAULT_DOWNLOAD_DIR)
    return parser.parse_args()

# Get file extension from URL
def get_file_extension(url):
    return url.split('.')[-1].split('?')[0] if '.' in url else 'mp3'

# Generate file path
def generate_file_path(name, ext, download_dir, counter=0):
    base = os.path.join(download_dir, name)
    return f"{base}({counter}).{ext}" if counter else f"{base}.{ext}"

# Download file
def download_file(url, path):
    try:
        print(f"Downloading from URL: {url}")
        print(f"Saving to: {path}")
        
        # 如果URL为空或无效，则返回失败
        if not url or not url.startswith('http'):
            print(f"Invalid URL: {url}")
            return False
            
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # 确保目标目录存在
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        with open(path, "wb") as file:
            file.write(response.content)
            
        file_size = os.path.getsize(path)
        print(f"Downloaded file size: {file_size} bytes")
        return file_size > 0
    except requests.RequestException as e:
        print(f"Download request failed: {e}")
        return False
    except IOError as e:
        print(f"File IO error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error during download: {e}")
        return False

# Save lyrics to a separate file
def save_lyrics(lyrics_url, song_title, download_dir):
    try:
        lyrics_response = requests.get(lyrics_url)
        if lyrics_response.ok:
            try:
                lyrics_data = lyrics_response.json()
                
                # 获取原始歌词
                original_lyrics = lyrics_data.get('lrc', {}).get('lyric', '')
                
                # 获取翻译歌词
                translated_lyrics = lyrics_data.get('tlyric', {}).get('lyric', '')
                
                # 合并歌词和翻译
                if translated_lyrics:
                    print("翻译歌词可用，正在合并翻译...")
                    lyrics = merge_lyrics_with_translation(original_lyrics, translated_lyrics)
                else:
                    print("无翻译歌词，使用原始歌词")
                    lyrics = original_lyrics
                
                lyrics_path = generate_file_path(song_title, "lrc", download_dir)
                with open(lyrics_path, "w", encoding="utf-8") as lyrics_file:
                    lyrics_file.write(lyrics)
                print(f"歌词已保存到: {lyrics_path}")
            except ValueError as e:
                print(f"解析歌词JSON时出错: {e}")
        else:
            print("下载歌词失败")
    except requests.RequestException as e:
        print(f"下载歌词时发生错误: {e}")

# Set MP3 metadata
def set_mp3_metadata(path, metadata):
    try:
        print(f"Loading MP3 file: {path}")
        audio = eyed3.load(path)
        if not audio:
            print(f"Unable to load file: {path}")
            return

        print("Initializing tag")
        audio.initTag()  
        
        # Set cover
        if metadata['cover_url'] and metadata['cover_url'].startswith('http'):
            try:
                print(f"Fetching cover from: {metadata['cover_url']}")
                cover_response = requests.get(metadata['cover_url'], timeout=10)
                cover_response.raise_for_status()
                cover_data = cover_response.content
                print(f"Cover data size: {len(cover_data)} bytes")
                
                mime_type = "image/jpeg" if metadata['cover_url'].endswith(('jpg', 'jpeg')) else "image/png"
                print(f"Setting cover with mime type: {mime_type}")
                audio.tag.images.set(3, cover_data, mime_type)
                print("Cover set successfully")
            except Exception as e:
                print(f"Failed to set cover: {e}")
        else:
            print("No valid cover URL provided")
        
        # Set lyrics
        if metadata['lyrics_url'] and metadata['lyrics_url'].startswith('http'):
            try:
                print(f"Fetching lyrics from: {metadata['lyrics_url']}")
                lyrics_response = requests.get(metadata['lyrics_url'], timeout=10)
                lyrics_response.raise_for_status()
                
                if lyrics_response.ok:
                    try:
                        lyrics_data = lyrics_response.json()
                        
                        # 获取原始歌词
                        original_lyrics = lyrics_data.get('lrc', {}).get('lyric', '')
                        
                        # 获取翻译歌词
                        translated_lyrics = lyrics_data.get('tlyric', {}).get('lyric', '')
                        
                        # 合并歌词和翻译
                        if translated_lyrics:
                            print("翻译歌词可用，正在合并翻译...")
                            lyrics = merge_lyrics_with_translation(original_lyrics, translated_lyrics)
                        else:
                            print("无翻译歌词，使用原始歌词")
                            lyrics = original_lyrics
                        
                        if lyrics:
                            print(f"Lyrics length: {len(lyrics)} characters")
                            audio.tag.lyrics.set(lyrics)
                            print("Lyrics set successfully")
                        else:
                            print("Empty lyrics returned from API")
                    except ValueError as e:
                        print(f"Error parsing lyrics JSON: {e}")
                else:
                    print(f"Lyrics API returned status code: {lyrics_response.status_code}")
            except Exception as e:
                print(f"Failed to set lyrics: {e}")
        else:
            print("No valid lyrics URL provided")

        # Set other metadata, ensuring UTF-8 encoding
        print("Setting basic metadata...")
        audio.tag.title = metadata['title']
        audio.tag.artist = metadata['artist']
        audio.tag.album = metadata['album']
        audio.tag.copyright = metadata['song_id']

        # Set publish time
        if metadata['publish_time']:
            try:
                publish_time = datetime.datetime.strptime(metadata['publish_time'], '%Y-%m-%d %H:%M:%S')
                release_time = publish_time.strftime('%Y-%m-%dT%H:%M:%S')
                audio.tag.recording_date = release_time
                audio.tag.release_time = release_time
                print(f"Publish time set: {release_time}")
            except ValueError as e:
                print(f"Invalid publish time format: {e}")
        else:
            print("No publish time provided")

        try:
            url_encoded_path = urllib.parse.quote(path)
            audio.tag.save(encoding='utf-8')
            print("MP3 metadata saved successfully:" + url_encoded_path)
            return True
        except Exception as e:
            print(f"Failed to save MP3 metadata: {e}")
            return False
    except Exception as e:
        print(f"Unexpected error in set_mp3_metadata: {e}")
        return False

# Set FLAC metadata
def set_flac_metadata(path, metadata):
    try:
        print(f"Loading FLAC file: {path}")
        audio = FLAC(path)
        print("FLAC file loaded successfully")
        
        # Set cover image
        if metadata['cover_url'] and metadata['cover_url'].startswith('http'):
            try:
                print(f"Fetching cover from: {metadata['cover_url']}")
                cover_response = requests.get(metadata['cover_url'], timeout=10)
                cover_response.raise_for_status()
                cover_data = cover_response.content
                print(f"Cover data size: {len(cover_data)} bytes")
                
                mime_type = "image/jpeg" if metadata['cover_url'].endswith(('jpg', 'jpeg')) else "image/png"
                print(f"Setting cover with mime type: {mime_type}")
                
                picture = Picture()
                picture.type = 3  # Cover art
                picture.mime = mime_type
                picture.data = cover_data
                audio.add_picture(picture)
                print("Cover set successfully")
            except Exception as e:
                print(f"Failed to set cover: {e}")
        else:
            print("No valid cover URL provided")

        # Set other metadata, ensuring UTF-8 encoding
        print("Setting basic metadata...")
        audio['title'] = metadata['title']
        audio['artist'] = metadata['artist']
        audio['album'] = metadata['album']
        audio['copyright'] = str(metadata['song_id'])

        # Set publish time
        if metadata['publish_time']:
            try:
                publish_time = metadata['publish_time']
                publish_time = datetime.datetime.strptime(publish_time, '%Y-%m-%d %H:%M:%S')
                audio['date'] = publish_time.strftime('%Y-%m-%d')
                audio['YEAR'] = publish_time.strftime('%Y')
                print(f"Publish time set: {audio['date']}, Year: {audio['YEAR']}")
            except ValueError as e:
                print(f"Invalid publish time format: {e}")
        else:
            print("No publish time provided")

        # Fetch and set lyrics (if available)
        if metadata['lyrics_url'] and metadata['lyrics_url'].startswith('http'):
            try:
                print(f"Fetching lyrics from: {metadata['lyrics_url']}")
                lyrics_response = requests.get(metadata['lyrics_url'], timeout=10)
                lyrics_response.raise_for_status()
                
                if lyrics_response.status_code == 200:
                    try:
                        lyrics_data = lyrics_response.json()
                        
                        # 获取原始歌词
                        original_lyrics = lyrics_data.get('lrc', {}).get('lyric', '')
                        
                        # 获取翻译歌词
                        translated_lyrics = lyrics_data.get('tlyric', {}).get('lyric', '')
                        
                        # 合并歌词和翻译
                        if translated_lyrics:
                            print("翻译歌词可用，正在合并翻译...")
                            lyrics = merge_lyrics_with_translation(original_lyrics, translated_lyrics)
                        else:
                            print("无翻译歌词，使用原始歌词")
                            lyrics = original_lyrics
                        
                        if lyrics:
                            print(f"Lyrics length: {len(lyrics)} characters")
                            audio['LYRICS'] = lyrics  # Adding lyrics as LYRICS
                            print("Lyrics set successfully")
                        else:
                            print("Empty lyrics returned from API")
                    except ValueError as e:
                        print(f"Error parsing lyrics JSON: {e}")
                else:
                    print(f"Lyrics API returned status code: {lyrics_response.status_code}")
            except Exception as e:
                print(f"Failed to set lyrics: {e}")
        else:
            print("No valid lyrics URL provided")

        # Save the FLAC metadata
        try:
            audio.save()
            print(f"FLAC metadata saved successfully: {path}")
            return True
        except Exception as e:
            print(f"Failed to save FLAC metadata: {e}")
            return False
    except Exception as e:
        print(f"Unexpected error in set_flac_metadata: {e}")
        return False

# 合并原始歌词和翻译歌词
def merge_lyrics_with_translation(original, translation):
    """将原始歌词和翻译歌词合并为一个文件，每个时间标记后跟原文和翻译"""
    if not original or not translation:
        return original
    
    # 解析歌词和翻译，并按时间戳组织
    original_lines = {}
    translation_lines = {}
    
    # 解析原始歌词
    for line in original.splitlines():
        if line.strip() and '[' in line:
            time_tag = line[line.find('['):line.find(']')+1]
            if time_tag and len(time_tag) > 2:
                content = line[line.find(']')+1:].strip()
                original_lines[time_tag] = content
    
    # 解析翻译歌词
    for line in translation.splitlines():
        if line.strip() and '[' in line:
            time_tag = line[line.find('['):line.find(']')+1]
            if time_tag and len(time_tag) > 2:
                content = line[line.find(']')+1:].strip()
                translation_lines[time_tag] = content
    
    # 合并歌词
    merged_lyrics = []
    
    # 先添加信息头（如果有）
    for line in original.splitlines():
        if line.startswith('[ti:') or line.startswith('[ar:') or line.startswith('[al:'):
            merged_lyrics.append(line)
    
    # 按时间顺序合并歌词
    for time_tag, content in sorted(original_lines.items()):
        if content:  # 忽略空行
            merged_line = f"{time_tag}{content}"
            merged_lyrics.append(merged_line)
            
            # 如果有对应的翻译，添加翻译行
            if time_tag in translation_lines and translation_lines[time_tag]:
                trans_content = translation_lines[time_tag]
                # 使用相同的时间标记，但添加翻译提示
                merged_lyrics.append(f"{time_tag}【译】{trans_content}")
    
    return '\n'.join(merged_lyrics)

# Main process
def main():
    try:
        args = parse_args()
        download_dir = args.download_dir
        print(f"Using download directory: {download_dir}")
        
        # 确保下载目录存在
        os.makedirs(download_dir, exist_ok=True)
        print(f"Download directory verified/created")

        # Ensure that the song download URL is provided
        if not args.u:
            print("Error: Song download URL (-u) is required.")
            sys.exit(1)

        # 验证参数
        print(f"Song name: {args.f}")
        print(f"Song URL: {args.u}")
        print(f"Cover URL: {args.c}")
        print(f"Lyrics URL: {args.l}")
        print(f"Song ID: {args.i}")
        print(f"Title: {args.t}")
        print(f"Artist: {args.ar}")
        print(f"Album: {args.al}")
        print(f"Publish time: {args.p}")
        print(f"Save lyrics separately: {args.sl}")

        # Decode the file name to handle any URL-encoded characters
        decoded_filename = unquote(args.f)
        print(f"Decoded filename: {decoded_filename}")

        # Get file extension and path
        file_extension = get_file_extension(args.u)
        print(f"File extension determined as: {file_extension}")
        
        file_path = generate_file_path(decoded_filename, file_extension, download_dir)
        print(f"Target file path: {file_path}")

        # Download music file
        print("Starting file download...")
        download_success = download_file(args.u, file_path)
        if not download_success:
            print("Download failed or file is empty")
            sys.exit(1)
        print("File download completed successfully")

        # Prepare metadata dictionary
        metadata = {
            'cover_url': args.c,
            'lyrics_url': args.l,
            'song_id': args.i,
            'title': unquote(args.t),
            'artist': unquote(args.ar),
            'album': unquote(args.al),
            'publish_time': args.p
        }
        print("Metadata prepared for embedding")

        # Save lyrics to a separate file if requested
        if args.sl and args.l:
            print("Saving lyrics as separate file...")
            save_lyrics(args.l, decoded_filename, download_dir)

        # Set metadata for the downloaded file
        metadata_success = False
        if file_extension == "mp3":
            print("Setting MP3 metadata...")
            metadata_success = set_mp3_metadata(file_path, metadata)
        elif file_extension == "flac":
            print("Setting FLAC metadata...")
            metadata_success = set_flac_metadata(file_path, metadata)
        else:
            print(f"Unsupported file type: {file_extension}")
            
        if metadata_success:
            print("Metadata successfully embedded in the file")
            print(f"successfully:{file_path}")
        else:
            print("Warning: File was downloaded but metadata may not be complete")
            print(f"successfully:{file_path}")
    except Exception as e:
        print(f"Unexpected error in main process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

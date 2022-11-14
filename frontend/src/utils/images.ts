/**
 * Helper for image manipulation and image-related utility functions
 *
 */
import { BaseItemDto, BaseItemPerson, ImageType } from '@jellyfin/client-axios';
import {
  getShapeFromItemType,
  ValidCardShapes,
  isPerson,
  CardShapes
} from '~/utils/items';

export interface ImageUrlInfo {
  url: string | undefined;
  tag: string | null | undefined;
  blurhash: string | undefined;
}

const excludedBlurhashTypes = [ImageType.Logo];

/**
 * Gets the tag of the image of an specific item and type.
 *
 * @param item - The item object.
 * @param type - The type of the image requested.
 * @param [index=0] - Index of the Backdrop image (when ImageType equals to 'Backdrop').
 * @param [checkParent=true] - Looks for tag/image type for the parent if the passed item doesn't have the ImageType requested
 * @returns Returns the tag, undefined if the specific ImageType doesn't exist.
 */
export function getImageTag(
  item: BaseItemDto | BaseItemPerson,
  type: ImageType,
  index = 0,
  checkParent = true
): string | undefined {
  if (!item) {
    return;
  }

  if (isPerson(item)) {
    if (item.PrimaryImageTag && type === ImageType.Primary) {
      return item.PrimaryImageTag;
    } else {
      return;
    }
  }

  if (item.ImageTags?.[type]) {
    return item.ImageTags?.[type];
  } else if (type === ImageType.Backdrop && item.BackdropImageTags?.[index]) {
    return item.BackdropImageTags[index];
  }

  if (checkParent) {
    switch (type) {
      case ImageType.Primary:
        if (item.AlbumPrimaryImageTag) {
          return item.AlbumPrimaryImageTag;
        } else if (item.ChannelPrimaryImageTag) {
          return item.ChannelPrimaryImageTag;
        } else if (item.ParentPrimaryImageTag) {
          return item.ParentPrimaryImageTag;
        }

        break;
      case ImageType.Art:
        if (item.ParentArtImageTag) {
          return item.ParentArtImageTag;
        }

        break;
      case ImageType.Backdrop:
        if (item.ParentBackdropImageTags?.[index]) {
          return item.ParentBackdropImageTags[index];
        }

        break;
      case ImageType.Logo:
        if (item.ParentLogoImageTag) {
          return item.ParentLogoImageTag;
        }

        break;
      case ImageType.Thumb:
        if (item.ParentThumbImageTag) {
          return item.ParentThumbImageTag;
        }

        break;
      default:
        return undefined;
    }
  }
}

/**
 * Gets the itemId of the parent element.
 *
 * @param item - The item object.
 * @returns Returns the parent itemId, undefined if it doesn't exist.
 */
export function getParentId(item: BaseItemDto): string | undefined {
  if (item.AlbumId) {
    return item.AlbumId;
  } else if (item.ChannelId) {
    return item.ChannelId;
  } else if (item.SeriesId) {
    return item.SeriesId;
  } else if (item.ParentArtItemId) {
    return item.ParentArtItemId;
  } else if (item.ParentPrimaryImageItemId) {
    return item.ParentPrimaryImageItemId;
  } else if (item.ParentThumbItemId) {
    return item.ParentThumbItemId;
  } else if (item.ParentBackdropItemId) {
    return item.ParentBackdropItemId;
  } else if (item.ParentLogoItemId) {
    return item.ParentLogoItemId;
  } else if (item.SeasonId) {
    return item.SeasonId;
  } else if (item.ParentId) {
    return item.ParentId;
  }
}
/**
 * Gets the blurhash string of an image given the item and the image type desired.
 *
 * @param item - The item object.
 * @param type - The type of the image requested.
 * @param [index=0] - Index of the Backdrop image (when ImageType equals to 'Backdrop').
 * @param [checkParent=true] - Checks for the parent's images blurhash (in case the provided item doesn't have it)
 * @returns Returns the tag, undefined if the specific ImageType doesn't exist.
 */
export function getBlurhash(
  item: BaseItemDto | BaseItemPerson,
  type: ImageType,
  index = 0,
  checkParent = true
): string | undefined {
  if (item) {
    const tag = getImageTag(item, type, index, checkParent);

    if (
      tag &&
      !excludedBlurhashTypes.includes(type) &&
      item.ImageBlurHashes?.[type]?.[tag]
    ) {
      return item.ImageBlurHashes?.[type]?.[tag];
    }
  }
}
/**
 * Gets the desired aspect ratio based on card shape
 * @param shape
 * @returns
 */
export function getDesiredAspect(shape: ValidCardShapes): number {
  let aspectRatio;

  switch (shape) {
    case CardShapes.Portrait:
      aspectRatio = 2 / 3;
      break;
    case CardShapes.Thumb:
      aspectRatio = 16 / 9;
      break;
    case CardShapes.Banner:
      aspectRatio = 1000 / 185;
      break;
    case CardShapes.Square:
    default:
      aspectRatio = 1;
      break;
  }

  return aspectRatio;
}
/**
 * Generates the image information for a BaseItemDto or a BasePersonDto according to set priorities.
 *
 * @param item - Item to get image information for
 * @param [options] - Optional parameters for the function.
 * @param [options.shape] - Shape of the card or element, used to determine what kind of image to prefer
 * @param [options.preferThumb=false] - Prefer the Thumb images
 * @param [options.preferBanner=false] - Prefer the Banner images
 * @param [options.preferLogo=false] - Prefer the Logo images
 * @param [options.preferBackdrop=false] - Prefer the Backdrop images
 * @param [options.inheritThumb=false] - Inherit the thumb from parent items
 * @param [options.quality=90] - Sets the quality of the returned image
 * @param [options.width] - Sets the requested width of the image
 * @param [options.ratio=1] - Sets the device pixel ratio for the image, used for computing the real image size
 * @param [options.tag] - Sets a specific image tag to get, bypassing the automatic priorities.
 * @returns Information for the item, containing the full URL, image tag and blurhash.
 */
export function getImageInfo(
  item: BaseItemDto | BaseItemPerson,
  {
    shape = getShapeFromItemType(item.Type),
    preferThumb = false,
    preferBanner = false,
    preferLogo = false,
    preferBackdrop = false,
    inheritThumb = true,
    quality = 90,
    width,
    ratio = 1,
    tag
  }: {
    shape?: ValidCardShapes;
    preferThumb?: boolean;
    preferBanner?: boolean;
    preferLogo?: boolean;
    preferBackdrop?: boolean;
    inheritThumb?: boolean;
    quality?: number;
    width?: number;
    ratio?: number;
    tag?: string;
  } = {}
): ImageUrlInfo {
  // TODO: Refactor to have separate getPosterImageInfo, getThumbImageInfo and getBackdropImageInfo.
  let url;
  let imgType;
  let imgTag;
  let itemId: string | null | undefined = item.Id;
  let height;

  if (tag && preferBackdrop) {
    imgType = ImageType.Backdrop;
    imgTag = tag;
  } else if (tag && preferBanner) {
    imgType = ImageType.Banner;
    imgTag = tag;
  } else if (tag && preferLogo) {
    imgType = ImageType.Logo;
    imgTag = tag;
  } else if (tag && preferThumb) {
    imgType = ImageType.Thumb;
    imgTag = tag;
  } else if (tag) {
    imgType = ImageType.Primary;
    imgTag = tag;
  } else if (isPerson(item)) {
    imgType = ImageType.Primary;
    imgTag = item.PrimaryImageTag;
  } else if (preferThumb && item.ImageTags && item.ImageTags.Thumb) {
    imgType = ImageType.Thumb;
    imgTag = item.ImageTags.Thumb;
  } else if (
    (preferBanner || shape === CardShapes.Banner) &&
    item.ImageTags &&
    item.ImageTags.Banner
  ) {
    imgType = ImageType.Banner;
    imgTag = item.ImageTags.Banner;
  } else if (preferLogo && item.ImageTags && item.ImageTags.Logo) {
    imgType = ImageType.Logo;
    imgTag = item.ImageTags.Logo;
  } else if (preferBackdrop && item.BackdropImageTags?.[0]) {
    imgType = ImageType.Backdrop;
    imgTag = item.BackdropImageTags[0];
  } else if (preferLogo && item.ParentLogoImageTag && item.ParentLogoItemId) {
    imgType = ImageType.Logo;
    imgTag = item.ParentLogoImageTag;
    itemId = item.ParentLogoItemId;
  } else if (
    preferBackdrop &&
    item.ParentBackdropImageTags?.[0] &&
    item.ParentBackdropItemId
  ) {
    imgType = ImageType.Backdrop;
    imgTag = item.ParentBackdropImageTags[0];
    itemId = item.ParentBackdropItemId;
  } else if (preferThumb && item.SeriesThumbImageTag && inheritThumb) {
    imgType = ImageType.Thumb;
    imgTag = item.SeriesThumbImageTag;
    itemId = item.SeriesId;
  } else if (
    preferThumb &&
    item.ParentThumbItemId &&
    inheritThumb &&
    item.MediaType !== 'Photo'
  ) {
    imgType = ImageType.Thumb;
    imgTag = item.ParentThumbImageTag;
    itemId = item.ParentThumbItemId;
  } else if (
    preferThumb &&
    item.BackdropImageTags &&
    item.BackdropImageTags.length
  ) {
    imgType = ImageType.Backdrop;
    imgTag = item.BackdropImageTags[0];
  } else if (
    preferThumb &&
    item.ParentBackdropImageTags &&
    item.ParentBackdropImageTags.length &&
    inheritThumb &&
    item.Type === 'Episode'
  ) {
    imgType = ImageType.Backdrop;
    imgTag = item.ParentBackdropImageTags[0];
    itemId = item.ParentBackdropItemId;
  } else if (
    item.ImageTags &&
    item.ImageTags.Primary &&
    (item.Type !== 'Episode' || item.ChildCount !== 0)
  ) {
    imgType = ImageType.Primary;
    imgTag = item.ImageTags.Primary;
    height =
      width && item.PrimaryImageAspectRatio
        ? Math.round(width / item.PrimaryImageAspectRatio)
        : null;
  } else if (item.SeriesPrimaryImageTag) {
    imgType = ImageType.Primary;
    imgTag = item.SeriesPrimaryImageTag;
    itemId = item.SeriesId;
  } else if (item.ParentPrimaryImageTag) {
    imgType = ImageType.Primary;
    imgTag = item.ParentPrimaryImageTag;
    itemId = item.ParentPrimaryImageItemId;
  } else if (item.AlbumId && item.AlbumPrimaryImageTag) {
    imgType = ImageType.Primary;
    imgTag = item.AlbumPrimaryImageTag;
    itemId = item.AlbumId;
    height =
      width && item.PrimaryImageAspectRatio
        ? Math.round(width / item.PrimaryImageAspectRatio)
        : null;
  } else if (item.Type === 'Season' && item.ImageTags && item.ImageTags.Thumb) {
    imgType = ImageType.Thumb;
    imgTag = item.ImageTags.Thumb;
  } else if (item.BackdropImageTags && item.BackdropImageTags.length) {
    imgType = ImageType.Backdrop;
    imgTag = item.BackdropImageTags[0];
  } else if (item.ImageTags && item.ImageTags.Thumb) {
    imgType = ImageType.Thumb;
    imgTag = item.ImageTags.Thumb;
  } else if (item.SeriesThumbImageTag && inheritThumb !== false) {
    imgType = ImageType.Thumb;
    imgTag = item.SeriesThumbImageTag;
    itemId = item.SeriesId;
  } else if (item.ParentThumbItemId && inheritThumb !== false) {
    imgType = ImageType.Thumb;
    imgTag = item.ParentThumbImageTag;
    itemId = item.ParentThumbItemId;
  } else if (
    item.ParentBackdropImageTags &&
    item.ParentBackdropImageTags.length &&
    inheritThumb !== false
  ) {
    imgType = ImageType.Backdrop;
    imgTag = item.ParentBackdropImageTags[0];
    itemId = item.ParentBackdropItemId;
  }

  if (!itemId) {
    itemId = item.Id;
  }

  if (imgTag && imgType) {
    url = new URL(
      `${window.$nuxt.$axios.defaults.baseURL}/Items/${itemId}/Images/${imgType}`
    );

    const params: Record<string, string> = {
      imgTag,
      quality: quality.toString()
    };

    if (width) {
      width = Math.round(width * ratio);
      params.maxWidth = width.toString();
    }

    if (height) {
      height = Math.round(height * ratio);
      params.maxHeight = height.toString();
    }

    url.search = new URLSearchParams(params).toString();
  }

  return {
    url: url?.href,
    tag: imgTag,
    blurhash: imgType && imgTag ? item.ImageBlurHashes?.[imgType]?.[imgTag] : ''
  };
}
/**
 * Generates the logo information for a BaseItemDto or a BasePersonDto according to set priorities.
 *
 * @param item - Item to get image information for
 * @param [options] - Optional parameters for the function.
 * @param [options.quality=90] - Sets the quality of the returned image
 * @param [options.width] - Sets the requested width of the image
 * @param [options.ratio=1] - Sets the device pixel ratio for the image, used for computing the real image size
 * @param [options.tag] - Sets a specific image tag to get, bypassing the automatic priorities.
 * @returns Information for the item, containing the full URL, image tag and blurhash.
 */
export function getLogo(
  item: BaseItemDto,
  {
    quality = 90,
    width,
    ratio = 1,
    tag
  }: {
    quality?: number;
    width?: number;
    ratio?: number;
    tag?: string;
  } = {}
): ImageUrlInfo {
  let url;
  let imgType;
  let imgTag;
  let itemId: string | null | undefined = item.Id;

  if (tag) {
    imgType = ImageType.Logo;
    imgTag = tag;
  } else if (item.ImageTags && item.ImageTags.Logo) {
    imgType = ImageType.Logo;
    imgTag = item.ImageTags.Logo;
  } else if (item.ParentLogoImageTag && item.ParentLogoItemId) {
    imgType = ImageType.Logo;
    imgTag = item.ParentLogoImageTag;
    itemId = item.ParentLogoItemId;
  }

  if (imgTag && imgType) {
    url = new URL(
      `${window.$nuxt.$axios.defaults.baseURL}/Items/${itemId}/Images/${imgType}`
    );

    const params: Record<string, string> = {
      imgTag,
      quality: quality.toString()
    };

    if (width) {
      width = Math.round(width * ratio);
      params.maxWidth = width.toString();
    }

    url.search = new URLSearchParams(params).toString();
  }

  return {
    url: url?.href,
    tag: imgTag,
    blurhash: imgType && imgTag ? item.ImageBlurHashes?.[imgType]?.[imgTag] : ''
  };
}

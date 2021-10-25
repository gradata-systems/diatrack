import {ThemePalette} from '@angular/material/core';

/**
 * Buttons to display. If omitted, a single button with the label "CLOSE" is displayed.
 */
export interface NotificationDialogButtons
{
    primary?: {
        text: string;
        color?: ThemePalette
    };

    cancel?: string;
}

export interface NotificationDialogOptions
{
    title: string;

    /**
     * Text to display. If an array, each element is rendered as a separate line
     */
    message: string | Array<string>;

    /**
     * Material icon to display in the dialog area
     */
    icon: string;

    /**
     * Determines the colour of the icon and primary button
     */
    color: string;

    buttons?: NotificationDialogButtons;
}

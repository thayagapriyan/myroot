# Family Tree App

A React Native app built with Expo Router and TypeScript for creating and managing family trees. Visualize family relationships, add members and relations, export/import data, and more.

## Features

- **Family Tree Visualization**: Interactive tree view with nodes representing family members and edges showing relationships.
- **Member Management**: Add, edit, and delete family members with profiles including name, date of birth, email, and photos.
- **Relationships**: Add parent, child, spouse, sibling, and partner relations between members.
- **Edit Mode**: Toggle edit mode to delete members directly from the tree view.
- **Export/Import**: Export family data to JSON and import from JSON files for backup and sharing.
- **Authentication**: Simple login/signup with PIN for multiple user profiles.
- **Cross-Platform**: Runs on iOS, Android, and Web using Expo.

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install required packages (if not already included):

   ```bash
   npm install @react-native-async-storage/async-storage expo-image-picker expo-document-picker expo-sharing expo-file-system
   ```

## Running the App

Start the development server:

```bash
npx expo start
```

In the output, choose to open in:
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

## Usage

### Getting Started
- **Login/Signup**: Create or log into a user profile with email and PIN.
- **Default Member**: If no family exists, a "Me" member is created automatically.

### Tree View
- Navigate to the Tree screen to see the family tree.
- Tap a node to select it and show action buttons (+ for adding relations).
- Double-tap or tap again to view member details.
- Use the Edit button to enter edit mode: show delete (-) buttons on all nodes.

### Adding Members and Relations
- Use the + buttons on nodes to add parents, children, or spouses.
- Alternatively, use the Add Member screen or edit member profiles to add relations.

### Export/Import
- In the Tree screen, use the Export button to save family data as JSON.
- Use Import to load data from a JSON file.
- On mobile, files are shared via the native share sheet; on web, copy/paste JSON.

### Member Profiles
- View and edit member details, including uploading profile photos.

## Development

This project uses [Expo Router](https://docs.expo.dev/router/introduction) for file-based routing.

- **App Directory**: Screens are in `app/`.
- **Components**: Reusable UI in `components/`.
- **Services**: Data persistence in `services/`.
- **Utils**: Tree layout algorithm in `utils/`.

For more on Expo development:
- [Expo Documentation](https://docs.expo.dev/)
- [Learn Expo Tutorial](https://docs.expo.dev/tutorial/introduction/)

## Reset Project

To reset to a blank app:

```bash
npm run reset-project
```

This moves starter code to `app-example` and creates a fresh `app` directory.

## Community

Join the Expo community:
- [Expo on GitHub](https://github.com/expo/expo)
- [Discord](https://chat.expo.dev)

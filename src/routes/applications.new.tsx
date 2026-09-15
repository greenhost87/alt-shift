import { createFileRoute } from '@tanstack/react-router';
import { ApplicationGeneratorScreen } from '../components/features/application-generator/ApplicationGenerator';

export const Route = createFileRoute('/applications/new')({
  component: ApplicationGeneratorScreen,
});

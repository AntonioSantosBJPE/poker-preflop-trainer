// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { FormField } from '@/components/forms/FormField';
import { FormNumberField } from '@/components/forms/FormNumberField';
import { FormSelectField } from '@/components/forms/FormSelectField';
import { FormTextareaField } from '@/components/forms/FormTextareaField';
import { ToggleOptionGroup } from '@/components/forms/ToggleOptionGroup';

function createRegister(name: string): UseFormRegisterReturn {
  return {
    name,
    onBlur: vi.fn(),
    onChange: vi.fn(),
    ref: vi.fn(),
  };
}

describe('forms shared components', () => {
  it('renders text, number and textarea fields with errors', () => {
    render(
      <>
        <FormField
          id="name"
          label="Nome"
          register={createRegister('name')}
          error="Nome é obrigatório"
          disabled
        />
        <FormNumberField
          id="stack"
          label="Stack"
          register={createRegister('stack')}
          error="Stack inválido"
        />
        <FormTextareaField
          id="notes"
          label="Notas"
          register={createRegister('notes')}
          error="Notas obrigatórias"
        />
      </>,
    );

    expect(screen.getByLabelText('Nome')).toBeDisabled();
    expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Stack inválido')).toBeInTheDocument();
    expect(screen.getByText('Notas obrigatórias')).toBeInTheDocument();
  });

  it('renders select field and toggle group', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onToggle = vi.fn();

    render(
      <>
        <FormSelectField
          id="feedback"
          label="Feedback"
          value="immediate"
          options={[
            { value: 'immediate', label: 'Imediato' },
            { value: 'end', label: 'Final' },
          ]}
          onValueChange={onValueChange}
        />
        <ToggleOptionGroup
          value="single"
          onValueChange={onToggle}
          ariaLabel="Tipo de treino"
          options={[
            { value: 'single', label: 'Individual' },
            { value: 'simultaneous', label: 'Simultâneo' },
          ]}
        />
      </>,
    );

    await user.click(screen.getByRole('combobox', { name: /^Feedback$/ }));
    const endOption = await screen.findByRole('option', { name: 'Final' });
    expect(endOption).toHaveClass('text-popover-foreground');
    expect(endOption.className).toContain('data-[highlighted]:bg-accent');
    await user.click(endOption);
    expect(onValueChange).toHaveBeenCalledWith('end');

    await user.click(screen.getByRole('radio', { name: /simultâneo/i }));
    expect(onToggle).toHaveBeenCalledWith('simultaneous');
    expect(screen.getByLabelText('Feedback')).toBeInTheDocument();
  });
});
